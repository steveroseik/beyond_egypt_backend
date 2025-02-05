import { ObjectType, Field, Int } from '@nestjs/graphql';
import Decimal from 'decimal.js';
import { Discount } from 'src/discount/entities/discount.entity';
import { PaymentMethod } from 'support/enums';
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
} from 'typeorm';

@ObjectType()
@Entity('camp-registration', { schema: 'beyond_egypt' })
export class CampRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { name: 'parentId' })
  @Field()
  parentId: number;

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
    scale: 0,
  })
  @Field(() => GraphqlDecimal)
  totalPrice: Decimal;

  @Column('enum', {
    name: 'paymentMethod',
    enum: PaymentMethod,
  })
  @Field()
  paymentMethod: PaymentMethod;

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
}
