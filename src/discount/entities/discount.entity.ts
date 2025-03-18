import { ObjectType, Field, Int } from '@nestjs/graphql';
import { RegistrationHistory } from 'src/registration-history/entities/registration-history.entity';
import { Decimal, GraphqlDecimal } from 'support/scalars';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('discount', { schema: 'beyond_egypt' })
export class Discount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { name: 'name', length: 255 })
  name: string;

  @Column('varchar', { name: 'code', nullable: true, length: 255 })
  @Field({ nullable: true })
  code?: string;

  @Column('decimal', {
    name: 'percentage',
    nullable: true,
    precision: 10,
    scale: 2,
  })
  @Field(() => GraphqlDecimal, { nullable: true })
  percentage?: Decimal;

  @Column('decimal', {
    name: 'amount',
    nullable: true,
    precision: 10,
    scale: 2,
  })
  @Field(() => GraphqlDecimal, { nullable: true })
  amount?: string;

  @Column('datetime', { name: 'startDate', nullable: true, precision: 3 })
  @Field({ nullable: true })
  startDate: Date;

  @Column('datetime', { name: 'endDate', nullable: true, precision: 3 })
  @Field({ nullable: true })
  endDate: Date;

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

  @ManyToMany(
    () => RegistrationHistory,
    (registrationHistory) => registrationHistory.discountsApplied,
    { nullable: true },
  )
  registrationUsage?: RegistrationHistory[];
}
