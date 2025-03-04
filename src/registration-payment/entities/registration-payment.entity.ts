import { ObjectType, Field, Int } from '@nestjs/graphql';
import Decimal from 'decimal.js';
import { PaymentMethod, PaymentStatus } from 'support/enums';
import { GraphqlDecimal } from 'support/scalars';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@ObjectType()
@Entity('registration-payment', { schema: 'beyond_egypt' })
export class RegistrationPayment {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('int', { name: 'campRegistrationId' })
  @Field()
  campRegistrationId: number;

  @Column('enum', {
    name: 'paymentMethod',
    enum: PaymentMethod,
  })
  @Field(() => PaymentMethod)
  paymentMethod: PaymentMethod;

  @Column('enum', {
    name: 'status',
    enum: PaymentStatus,
    default: PaymentStatus.pending,
  })
  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Column('decimal', { name: 'total', precision: 10, scale: 2 })
  @Field(() => GraphqlDecimal)
  total: Decimal;

  @Column('int', { name: 'receiptId', nullable: true })
  @Field({ nullable: true })
  receiptId?: number;

  @Column('int', { name: 'userId' })
  @Field()
  userId: number;

  @CreateDateColumn({
    precision: 3,
    name: 'createdAt',
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  createdAt: Date;
}
