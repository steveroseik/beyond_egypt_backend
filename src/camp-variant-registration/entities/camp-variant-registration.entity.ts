import { ObjectType, Field, Int } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';

import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { Child } from 'src/child/entities/child.entity';
import { moneyFixation } from 'support/constants';
import { ShirtSize } from 'support/enums';
import { Decimal, GraphqlDecimal } from 'support/scalars';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('camp-variant-registration', { schema: 'beyond_egypt' })
@Unique(['childId', 'campVariantId'])
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

  @Column('decimal', {
    name: 'price',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value?: string) => value && new Decimal(value),
    },
  })
  @Field(() => GraphqlDecimal)
  price: Decimal;

  @Column('decimal', {
    name: 'mealPrice',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value?: string) => value && new Decimal(value),
    },
  })
  @Field(() => GraphqlDecimal)
  mealPrice: Decimal;

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
  @JoinColumn({ name: 'campRegistrationId', referencedColumnName: 'id' })
  @Field(() => CampRegistration)
  campRegistration: CampRegistration;

  @ManyToOne(() => Child, (child) => child.campVariantRegistrations, {
    cascade: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'childId', referencedColumnName: 'id' })
  @Field(() => Child)
  child: Child;

  @ManyToOne(
    () => CampVariant,
    (campVariant) => campVariant.campVariantRegistrations,
    {
      cascade: true,
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'campVariantId', referencedColumnName: 'id' })
  @Field(() => CampVariant)
  campVariant: CampVariant;
}
