import { ObjectType, Field, Int } from '@nestjs/graphql';
import Decimal from 'decimal.js';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { ShirtSize } from 'support/enums';
import { GraphqlDecimal } from 'support/scalars';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('camp-variant-registration', { schema: 'beyond_egypt' })
export class CampVariantRegistration {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('int', { name: 'childId' })
  @Field()
  childId: number;

  @Column('int', { name: 'campRegistrationId' })
  @Field()
  campRegistrationId: number;

  @Column('int', { name: 'campVariantId' })
  @Field()
  campVariantId: number;

  @Column('decimal', { name: 'price', precision: 10, scale: 2 })
  @Field(() => GraphqlDecimal)
  price: Decimal;

  @Column('int', { name: 'mealId', nullable: true })
  @Field({ nullable: true })
  mealId?: number;

  @Column('enum', {
    name: 'shirtSize',
    nullable: true,
    enum: ShirtSize,
  })
  @Field(() => ShirtSize, { nullable: true })
  shirtSize?: ShirtSize;

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

  @ManyToOne(
    () => CampRegistration,
    (campRegistration) => campRegistration.campVariantRegistrations,
  )
  @Field(() => CampRegistration)
  campRegistration: CampRegistration;
}
