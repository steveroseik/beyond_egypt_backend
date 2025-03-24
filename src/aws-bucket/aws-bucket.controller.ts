import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AwsBucketService } from './aws-bucket.service';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { memoryStorage } from 'multer';
import { Public } from 'src/auth/decorators/publicDecorator';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 10MB

@Controller('aws')
export class AwsBucketController {
  constructor(private readonly bucketService: AwsBucketService) {}

  @Post('/files')
  @UseInterceptors(
    FilesInterceptor('files', null, { storage: memoryStorage() }),
  )
  async uploadFiles(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE,
            message: 'File is too large. Max file size is 15MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
    @Body('isPublic') publicBool: string,
    @CurrentUser('id') userId: string,
  ) {
    const isPublicBool = publicBool === 'true';

    const uploadResults = await Promise.all(
      files.map((file) =>
        this.bucketService.uploadSingleFile({
          file,
          isPublic: isPublicBool,
          userId,
        }),
      ),
    );

    return uploadResults.map(({ file, url, isPublic }, index) => ({
      file,
      url,
      isPublic,
      name: files[index].originalname,
      extension: files[index].originalname.split('.').pop(),
    }));
  }

  @Post('/file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE, // 10MB
            message: 'File is too large. Max file size is 15MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('isPublic') publicBool: string,
    @CurrentUser('id') userId: string,
  ) {
    const isPublicBool = publicBool === 'true' ? true : false;

    return await this.bucketService.uploadSingleFile({
      file,
      isPublic: isPublicBool,
      userId,
    });
  }

  @Public()
  @Post('/base')
  async uploadBase64File(
    @Body('file') base64File: string,
    @Body('fileName') fileName: string,
    @Body('isPublic') publicBool: boolean,
    // @CurrentUser('id') userId: string,
  ) {
    console.log('base64File', base64File);
    console.log('fileName', fileName);
    console.log('publicBool', publicBool);
    if (!base64File || !fileName) {
      throw new HttpException(
        'Base64 file and file name are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.bucketService.uploadSingleFileFromBase64({
      base64File,
      fileName,
      isPublic: publicBool,
      // userId,
    });
  }

  @Get(':key')
  async getFileUrl(@Param('key') key: string) {
    return this.bucketService.getFileUrl(key);
  }

  @Get('/signed-url/:key')
  async getSingedUrl(@Param('key') key: string) {
    return this.bucketService.getPresignedSignedUrl(key);
  }

  @Delete(':key')
  async deleteFile(@Param('key') key: string) {
    return this.bucketService.deleteFile(key);
  }
}
