import { Injectable } from '@nestjs/common';
import { CreateLocationInput } from './dto/create-location.input';
import { UpdateLocationInput } from './dto/update-location.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location) private repo: Repository<Location>,
    private dataSource: DataSource,
  ) {}

  create(createLocationInput: CreateLocationInput) {
    return 'This action adds a new location';
  }

  findAll() {
    return `This action returns all location`;
  }

  findOne(id: number) {
    return `This action returns a #${id} location`;
  }

  update(id: number, updateLocationInput: UpdateLocationInput) {
    return `This action updates a #${id} location`;
  }

  remove(id: number) {
    return `This action removes a #${id} location`;
  }

  findAllByKeys(keys: readonly number[]) {
    return this.repo.find({ where: { id: In(keys) } });
  }
}
