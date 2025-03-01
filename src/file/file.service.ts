import { Injectable } from '@nestjs/common';
import { CreateFileInput } from './dto/create-file.input';
import { UpdateFileInput } from './dto/update-file.input';
import { InjectRepository } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File) private repo: Repository<File>,
    private dataSource: DataSource,
  ) {}

  create(createFileInput: CreateFileInput) {
    return 'This action adds a new file';
  }

  findAll() {
    return `This action returns all file`;
  }

  findOne(id: number) {
    return `This action returns a #${id} file`;
  }

  findAllByKeys(keys: readonly number[]) {
    return this.repo.find({ where: { id: In(keys) } });
  }

  update(id: number, updateFileInput: UpdateFileInput) {
    return `This action updates a #${id} file`;
  }

  remove(id: number) {
    return `This action removes a #${id} file`;
  }
}
