import { ObjectType, Field, Int } from '@nestjs/graphql';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { PaymentMethod, PaymentStatus } from 'support/enums';
import { Decimal, GraphqlDecimal } from 'support/scalars';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
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

  @Column('varchar', { name: 'url', nullable: true })
  @Field({ nullable: true })
  url?: string;

  @Column('enum', {
    name: 'status',
    enum: PaymentStatus,
    default: PaymentStatus.pending,
  })
  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Column('decimal', { name: 'amount', precision: 10, scale: 2 })
  @Field(() => GraphqlDecimal)
  amount: Decimal;

  @Column('int', { name: 'receiptId', nullable: true })
  @Field({ nullable: true })
  receiptId?: number;

  @Column('varchar', { name: 'userId' })
  @Field()
  userId: string;

  @Column('timestamp', { name: 'expirationDate', precision: 3, nullable: true })
  @Field({ nullable: true })
  expirationDate?: Date;

  @CreateDateColumn({
    precision: 3,
    name: 'createdAt',
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  createdAt: Date;

  @ManyToOne(
    () => CampRegistration,
    (campRegistration) => campRegistration.payments,
  )
  @JoinColumn({ name: 'campRegistrationId', referencedColumnName: 'id' })
  @Field(() => CampRegistration)
  campRegistration: CampRegistration;
}
