import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { AwsBucketService } from './aws-bucket.service';
import { Public } from 'src/auth/decorators/publicDecorator';
import { memoryStorage } from 'multer';
import fileTypeChecker from 'file-type-checker';
import { RequiresWebToken } from 'src/auth/decorators/webTokenDecorator';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { NotFoundError } from 'rxjs';
import { ForbiddenError } from '@nestjs/apollo';
import { response } from 'express';
import { UserType } from 'support/enums';

// Constants for file size and allowed file types
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
]; // Extend as needed

@Controller('api/aws-bucket')
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
  ) {
    const vdet = fileTypeChecker.detectFile(files[0].buffer);
    console.log(vdet);
    throw new Error('Not implemented');
    // const isPublicBool = publicBool === 'true';
    // const uploadResults = await Promise.all(
    //   files.map((file) =>
    //     this.bucketService.uploadSingleFile({
    //       file,
    //       merchantId,
    //       isPublic: isPublicBool,
    //     }),
    //   ),
    // );

    // return uploadResults.map(({ key, url, isPublic }, index) => ({
    //   key,
    //   url,
    //   isPublic,
    //   name: files[index].originalname,
    //   extension: files[index].originalname.split('.').pop(),
    // }));
  }

  @Post('/file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE, // 10MB
            message: 'File is too large. Max file size is 10MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('isPublic') publicBool: string,
    @Body('originalName') originalName: string,
    @CurrentUser('id') userId: string,
    @Body('merchantId') merchantIdParam?: number,
  ) {
    try {
      const isPublicBool = publicBool === 'true' ? true : false;

      return await this.bucketService.uploadSingleFile({
        file,
        isPublic: isPublicBool,
        userId,
        originalName,
      });
    } catch (e) {
      return {
        success: false,
        message: e,
      };
    }
  }

  @Public()
  @RequiresWebToken()
  @Post('/web-file')
  @UseInterceptors(FileInterceptor('file'))
  async webUploadFile(
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
    @Body('originalName') originalName?: string,
  ) {
    if (!originalName) throw new ForbiddenError('Original name is required');

    const isPublicBool = publicBool === 'true' ? true : false;
    const { key, url, isPublic } = await this.bucketService.uploadSingleFile({
      file,

      isPublic: isPublicBool,
      userId,
      originalName,
    });

    const extension = file.originalname.split('.').pop();
    // if (!isValidExtension(extension))
    //   return { message: 'Invalid file extension' };

    return {
      key,
      url,
      isPublic,
      name: file.originalname,
      extension: file.originalname.split('.').pop(),
    };
  }

  @Public()
  @Get(':key')
  async getFileUrl(@Param('key') key: string) {
    return this.bucketService.getFileUrl(key);
  }

  @Public()
  @Get('/signed-url/:key')
  async getSingedUrl(@Param('key') key: string) {
    return this.bucketService.getPresignedSignedUrl(key);
  }

  @Public()
  @Delete(':key')
  async deleteFile(@Param('key') key: string) {
    return this.bucketService.deleteFile(key);
  }
}
