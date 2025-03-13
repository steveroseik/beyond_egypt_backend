import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FawryReturnDto } from './models/fawry-return.dto';
import { generateStatusQuerySignature } from './generate/payment.generate';

@Injectable()
export class FawryService {
  constructor(private dataSource: DataSource) {}

  async handleReturn(query: FawryReturnDto) {
    if (query.statusCode !== '200') {
      throw new Error('Invalid status code');
    }

    // validate the fawry response
    const signature = generateStatusQuerySignature(query.merchantRefNumber);
  }
}
