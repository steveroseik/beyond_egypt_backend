import { Injectable } from '@nestjs/common';
import { CreateCampVariantInput } from './dto/create-camp-variant.input';
import { UpdateCampVariantInput } from './dto/update-camp-variant.input';

@Injectable()
export class CampVariantService {
  create(createCampVariantInput: CreateCampVariantInput) {
    return 'This action adds a new campVariant';
  }

  findAll() {
    return `This action returns all campVariant`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campVariant`;
  }

  update(id: number, updateCampVariantInput: UpdateCampVariantInput) {
    return `This action updates a #${id} campVariant`;
  }

  remove(id: number) {
    return `This action removes a #${id} campVariant`;
  }
}
