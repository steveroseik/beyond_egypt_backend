import { Controller, Get, Query, Res, Post, Body } from '@nestjs/common';
import { PaymobService } from './paymob.service';
import { PaymobReturnDto } from './models/payment.payload';
import { Public } from 'src/auth/decorators/publicDecorator';
import { Response } from 'express';

@Controller('paymob')
export class PaymobController {
  constructor(private readonly paymobService: PaymobService) {}

  @Public()
  @Get('return')
  handleReturn(@Query() query: PaymobReturnDto, @Res() res: Response) {
    return this.paymobService.handleReturn(query, res);
  }

  @Public()
  @Post('webhook')
  handleWebhook(@Body() body: any) {
    // TODO: Implement webhook handling for Paymob notifications
    console.log('Paymob webhook received:', body);
    return { success: true };
  }
} 