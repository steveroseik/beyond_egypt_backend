import { Controller, Get, Query, Res } from '@nestjs/common';
import { FawryService } from './fawry.service';
import { FawryReturnDto } from './models/fawry-return.dto';
import { Public } from 'src/auth/decorators/publicDecorator';
import { Response } from 'express';
import { generatePayAtAFawryPaymentUrl } from './generate/payment.generate';
import { PayAtFawryPayload } from './models/payment.payload';

@Controller('fawry')
export class FawryController {
  constructor(private readonly fawryService: FawryService) {}

  @Public()
  @Get('return')
  handleReturn(@Query() query: FawryReturnDto, @Res() res: Response) {
    return this.fawryService.handleReturn(query, res);
  }

  // @Public()
  // @Get('payAtFawry')
  // payAtFawry() {
  //   const payload: PayAtFawryPayload = {
  //     merchantRefNum: '13233',
  //     customerProfileId: '7777',
  //     customerEmail: 'dummy@email.com',
  //     customerMobile: '01000000000',
  //     customerName: 'Dummy Name',
  //     chargeItems: [
  //       {
  //         itemId: 'item123',
  //         quantity: 1,
  //         price: '100.00',
  //         description: 'Dummy item description',
  //       },
  //     ],
  //     currencyCode: 'EGP',
  //     amount: '100.00',
  //     paymentMethod: 'PayAtFawry',
  //     description: 'Dummy payment description',
  //     paymentExpiry: (new Date().getTime() + 20 * 60 * 60 * 60).toString(),
  //     language: 'en-gb',
  //   };

  //   return generatePayAtAFawryPaymentUrl(payload);
  // }
}
