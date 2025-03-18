import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class FawryReturnDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  merchantRefNumber?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  orderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  paymentAmount?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  fawryFees?: number;

  @IsString()
  @IsOptional()
  orderStatus?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  paymentTime?: number;

  @IsString()
  @IsOptional()
  cardLastFourDigits?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerProfileId?: string;

  @IsString()
  @IsOptional()
  signature?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  taxes?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  statusCode?: number;

  @IsString()
  @IsOptional()
  statusDescription?: string;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  basketPayment?: boolean;
}
