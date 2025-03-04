import { Injectable } from '@nestjs/common';
import { CreateRegistrationPaymentHistoryInput } from './dto/create-registration-payment.input';
import { UpdateRegistrationPaymentHistoryInput } from './dto/update-registration-payment.input';

@Injectable()
export class RegistrationPaymentHistoryService {
  create(
    createRegistrationPaymentHistoryInput: CreateRegistrationPaymentHistoryInput,
  ) {
    return 'This action adds a new registrationPaymentHistory';
  }

  findAll() {
    return `This action returns all registrationPaymentHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} registrationPaymentHistory`;
  }

  update(
    id: number,
    updateRegistrationPaymentHistoryInput: UpdateRegistrationPaymentHistoryInput,
  ) {
    return `This action updates a #${id} registrationPaymentHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} registrationPaymentHistory`;
  }
}
