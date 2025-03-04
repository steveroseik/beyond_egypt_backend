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
import { getFileType, isValidExtension } from 'support/file-type.support';

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
