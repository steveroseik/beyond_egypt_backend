import { ObjectType, Field, Int } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { moneyFixation } from 'support/constants';
import { PaymentMethod, PaymentStatus } from 'support/enums';
import {
  generateMerchantRefNumber,
  genId,
} from 'support/random-uuid.generator';
import { Decimal, GraphqlDecimal } from 'support/scalars';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@ObjectType()
@Entity('registration-payment', { schema: 'beyond_egypt' })
export class RegistrationPayment {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('varchar', {
    name: 'referenceNumber',
    length: 70,
    nullable: true,
  })
  @Field({ nullable: true })
  referenceNumber?: string;

  @Column('varchar', { name: 'paymentProviderRef', nullable: true })
  @Field({ nullable: true })
  paymentProviderRef?: string;

  @Column('int', { name: 'parentId', nullable: true })
  @Field({ nullable: true })
  parentId?: number;

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

  @Column('decimal', {
    name: 'amount',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value?: string) => value && new Decimal(value),
    },
  })
  @Field(() => GraphqlDecimal)
  amount: Decimal;

  @Column('varchar', { name: 'receipt', nullable: true })
  @Field({ nullable: true })
  receipt?: string;

  @Column('varchar', { name: '', nullable: true })
  @Field({ nullable: true })
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
    {
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'campRegistrationId', referencedColumnName: 'id' })
  @Field(() => CampRegistration)
  campRegistration: CampRegistration;

  @ManyToOne(() => RegistrationPayment, (payment) => payment.childPayments, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId', referencedColumnName: 'id' })
  @Field(() => RegistrationPayment, { nullable: true })
  parentPayment?: RegistrationPayment;

  @OneToMany(() => RegistrationPayment, (payment) => payment.parentPayment)
  @Field(() => [RegistrationPayment], { nullable: true })
  childPayments?: RegistrationPayment[];
}
