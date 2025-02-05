import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import fileTypeChecker from 'file-type-checker';
import { Readable } from 'stream';

// Define the magic numbers for allowed file types
// const MAGIC_NUMBERS: { [key: string]: Buffer } = {
//   'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
//   'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47]),
//   'image/gif': Buffer.from([0x47, 0x49, 0x46, 0x38]),
//   'image/svg+xml': Buffer.from([0x3c, 0x3f, 0x78, 0x6d, 0x6c]),
// };

@Injectable()
export class MultipleMagicNumberValidator implements PipeTransform {
  async transform(files: Express.Multer.File[]) {
    console.log('called');
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    for (const file of files) {
      if (!file || !file.buffer) {
        throw new BadRequestException('One or more files are empty or missing');
      }

      const vdet = fileTypeChecker.detectFile(file.buffer);
      console.log(vdet);

      const response = fileTypeChecker.validateFileType(file.buffer, [
        'png',
        'gif',
        'jpeg',
      ]);

      console.log(response);

      if (true) {
        throw new BadRequestException(
          'Invalid file type for ',
          file.originalname,
        );
      }
    }

    return files;
  }
}
