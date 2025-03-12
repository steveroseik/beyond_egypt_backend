import { Injectable } from '@nestjs/common';
import { CreateCampVariantRegistrationInput } from './dto/create-camp-variant-registration.input';
import { UpdateCampVariantRegistrationInput } from './dto/update-camp-variant-registration.input';
import { InjectRepository } from '@nestjs/typeorm';
import { CampVariantRegistration } from './entities/camp-variant-registration.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class CampVariantRegistrationService {
  constructor(
    @InjectRepository(CampVariantRegistration)
    private repo: Repository<CampVariantRegistration>,
  ) {}

  create(
    createCampVariantRegistrationInput: CreateCampVariantRegistrationInput,
  ) {
    return 'This action adds a new campVariantRegistration';
  }

  findAll() {
    return `This action returns all campVariantRegistration`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campVariantRegistration`;
  }

  update(
    id: number,
    updateCampVariantRegistrationInput: UpdateCampVariantRegistrationInput,
  ) {
    return `This action updates a #${id} campVariantRegistration`;
  }

  remove(id: number) {
    return `This action removes a #${id} campVariantRegistration`;
  }

  findCampVariantsRegistrationsByCampId(keys: readonly number[]) {
    return this.repo.find({ where: { campRegistrationId: In(keys) } });
  }
}
