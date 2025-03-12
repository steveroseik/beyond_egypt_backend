import { IsString, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class FawryReturnDto {
  @IsString()
  type: string;

  @IsString()
  referenceNumber: string;

  @IsString()
  merchantRefNumber: string;

  @IsNumber()
  @Type(() => Number)
  orderAmount: number;

  @IsNumber()
  @Type(() => Number)
  paymentAmount: number;

  @IsNumber()
  @Type(() => Number)
  fawryFees: number;

  @IsString()
  orderStatus: string;

  @IsString()
  paymentMethod: string;

  @IsNumber()
  @Type(() => Number)
  paymentTime: number;

  @IsString()
  cardLastFourDigits: string;

  @IsString()
  customerName: string;

  @IsString()
  customerProfileId: string;

  @IsString()
  signature: string;

  @IsNumber()
  @Type(() => Number)
  taxes: number;

  @IsNumber()
  @Type(() => Number)
  statusCode: number;

  @IsString()
  statusDescription: string;

  @IsBoolean()
  @Type(() => Boolean)
  basketPayment: boolean;
}
