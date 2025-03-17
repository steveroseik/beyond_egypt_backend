import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DataSource } from 'typeorm';
import path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { File } from '../file/entities/file.entity';
import { error } from 'console';
import {
  getFileType,
  getMimeType,
  isValidExtension,
} from 'support/file-type.support';

@Injectable()
export class AwsBucketService {
  private client: S3Client;
  private bucketName = this.configService.get('S3_BUCKET_NAME');

  constructor(
    private readonly configService: ConfigService,
    private dataSource: DataSource,
  ) {
    const s3_region = this.configService.get('S3_REGION');

    if (!s3_region) {
      throw new Error('S3_REGION not found in environment variables');
    }

    this.client = new S3Client({
      region: s3_region,
      credentials: {
        accessKeyId: this.configService.get('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
  }

  sanitizeFileName(fileName: string): string {
    // Replace non-ASCII characters with `_`
    return fileName.replace(/[^\x20-\x7E]/g, '_');
  }

  // methods inside DmsService class
  async uploadSingleFile({
    file,
    isPublic = true,
    userId,
  }: {
    file: Express.Multer.File;
    isPublic: boolean;
    userId: string;
  }) {
    try {
      const extension = file.originalname.split('.').pop();
      if (!isValidExtension(extension)) throw Error('Invalid file extension');

      const key = `${uuidv4()}.${extension}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: isPublic ? 'public-read' : 'private',

        Metadata: {
          originalName: this.sanitizeFileName(file.originalname),
        },
      });

      const uploadResult = await this.client.send(command);

      if (!uploadResult) {
        throw new Error('Failed to upload file to S3 bucket');
      }

      const addFile = await this.dataSource.manager.save(File, {
        key,
        type: getFileType(extension.toLowerCase()),
        name: file.originalname.split('.').shift(),
        sizeInKb: Math.floor(file.size / 1024),
        userId,
      });

      if (!addFile) {
        await this.deleteFile(key);
        throw new Error('Failed to add file to database');
      }

      return {
        success: true,
        url: isPublic
          ? (await this.getFileUrl(key)).url
          : (await this.getPresignedSignedUrl(key)).url,
        file: addFile,
        extension: extension,
        isPublic,
      };
    } catch (message) {
      console.log(message);
      throw new HttpException(
        {
          success: false,
          message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async uploadSingleFileFromBase64({
    base64File,
    fileName,
    isPublic = true,
    userId,
  }: {
    base64File: string; // This can be either plain base64 or a data URL (e.g. "data:image/png;base64,...")
    fileName: string; // Original file name with extension, e.g. "example.png"
    isPublic: boolean;
    userId: string;
  }) {
    try {
      // Extract the file extension from the provided file name.
      const extension = fileName.split('.').pop();
      if (!isValidExtension(extension))
        throw new Error('Invalid file extension');

      // Prepare variables for content type and base64 data.
      let contentType = '';
      let base64Data = base64File;

      // Check if the base64 string is in Data URL format.
      if (base64File.startsWith('data:')) {
        // Expected format: "data:[<mediatype>][;base64],<data>"
        const matches = base64File.match(/^data:(.*);base64,(.*)$/);
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid base64 data format');
        }
        contentType = matches[1];
        base64Data = matches[2];
      }

      // If contentType is still empty, deduce it from the extension.
      if (!contentType) {
        contentType = getMimeType(extension); // Assume a helper function that returns MIME type.
      }

      // Decode the base64 data to a Buffer.
      const buffer = Buffer.from(base64Data, 'base64');
      const fileSize = buffer.length;

      // Generate a unique key for the file.
      const key = `${uuidv4()}.${extension}`;

      // Create the S3 PutObject command.
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: isPublic ? 'public-read' : 'private',
        Metadata: {
          originalName: this.sanitizeFileName(fileName),
        },
      });

      // Upload the file to S3.
      const uploadResult = await this.client.send(command);
      if (!uploadResult) {
        throw new Error('Failed to upload file to S3 bucket');
      }

      // Save file details in the database.
      const addFile = await this.dataSource.manager.save(File, {
        key,
        type: getFileType(extension.toLowerCase()),
        name: fileName.split('.').shift(),
        sizeInKb: Math.floor(fileSize / 1024),
        userId,
      });

      if (!addFile) {
        await this.deleteFile(key);
        throw new Error('Failed to add file to database');
      }

      // Return a success response with the file URL.
      return {
        success: true,
        url: isPublic
          ? (await this.getFileUrl(key)).url
          : (await this.getPresignedSignedUrl(key)).url,
        file: addFile,
        extension: extension,
        isPublic,
      };
    } catch (error) {
      console.error(error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'File upload failed',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getFileUrl(key: string) {
    return { url: `https://${this.bucketName}.s3.amazonaws.com/${key}` };
  }

  async getPresignedSignedUrl(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: 60 * 60 * 24, // 24 hours
      });

      return { url };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async deleteFile(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);

      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async downloadAndUploadFile(
    fileUrl: string,
    isPublic = true,
    userId: string,
  ) {
    try {
      // Step 1: Download the file
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      });
      const fileName = path.basename(fileUrl);
      const filePath = path.join(__dirname, fileName);

      // Step 2: Save the file to a local directory
      fs.writeFileSync(filePath, response.data);

      // Step 3: Read the file from the local directory
      const fileBuffer = fs.readFileSync(filePath);

      // Step 4: Create a file object similar to Express.Multer.File
      const file: Express.Multer.File = {
        buffer: fileBuffer,
        originalname: fileName,
        mimetype: response.headers['content-type'],
        size: response.data.length,
        fieldname: '',
        encoding: '',
        stream: fs.createReadStream(filePath),
        destination: '',
        filename: '',
        path: filePath,
      };

      // Step 5: Upload the file to the AWS S3 bucket
      const uploadResult = await this.uploadSingleFile({
        file,
        isPublic,
        userId,
      });

      // Clean up the local file
      fs.unlinkSync(filePath);

      return uploadResult;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
