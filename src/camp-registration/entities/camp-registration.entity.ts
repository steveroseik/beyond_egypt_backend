import { ObjectType, Field, Int } from '@nestjs/graphql';
import Decimal from 'decimal.js';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { Discount } from 'src/discount/entities/discount.entity';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import { CampRegistrationStatus, PaymentMethod } from 'support/enums';
import { GraphqlDecimal } from 'support/scalars';
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';

@ObjectType()
@Entity('camp-registration', { schema: 'beyond_egypt' })
export class CampRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { name: 'parentId' })
  @Field()
  parentId: string;

  @Column('int', { name: 'campId' })
  @Field()
  campId: number;

  @Column('decimal', {
    name: 'oneDayPrice',
    nullable: true,
    precision: 10,
    scale: 0,
  })
  @Field(() => GraphqlDecimal, { nullable: true })
  oneDayPrice?: Decimal;

  @Column('decimal', {
    name: 'totalPrice',
    precision: 10,
    nullable: true,
    scale: 0,
  })
  @Field(() => GraphqlDecimal, { nullable: true })
  totalPrice?: Decimal;

  @Column('enum', {
    name: 'paymentMethod',
    enum: PaymentMethod,
    nullable: true,
  })
  @Field(() => PaymentMethod, { nullable: true })
  paymentMethod?: PaymentMethod;

  @Column('int', { name: 'capacity', nullable: true })
  @Field({ nullable: true })
  capacity?: number;

  @Column('bit', {
    name: 'paid',
    default: false,
    transformer: {
      to: (value: boolean) => value,
      from: (value: Buffer) => value && value[0] === 1,
    },
  })
  @Field()
  paid: boolean;

  @Column('enum', {
    name: 'status',
    enum: CampRegistrationStatus,
    default: CampRegistrationStatus.idle,
  })
  @Field(() => CampRegistrationStatus)
  status: CampRegistrationStatus;

  @CreateDateColumn({
    name: 'createdAt',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  createdAt: Date;

  @UpdateDateColumn({
    name: 'lastModified',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  lastModified: Date;

  @DeleteDateColumn({ name: 'deletedAt', precision: 3 })
  @Field({ nullable: true })
  deletedAt?: Date;

  @OneToMany(
    () => CampVariantRegistration,
    (campVariantRegistration) => campVariantRegistration.campRegistration,
    { nullable: true },
  )
  @Field(() => [CampVariantRegistration], { nullable: true })
  campVariantRegistrations: CampVariantRegistration[];

  @OneToMany(
    () => RegistrationPayment,
    (registrationPayment) => registrationPayment.campRegistration,
  )
  @Field(() => [RegistrationPayment])
  payments: RegistrationPayment[];
}
