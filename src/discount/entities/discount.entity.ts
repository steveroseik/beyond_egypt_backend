import { ObjectType, Field, Int } from '@nestjs/graphql';
import moment from 'moment-timezone';
import { Camp } from 'src/camp/entities/camp.entity';
import { Decimal, GraphqlDecimal } from 'support/scalars';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('discount', { schema: 'beyond_egypt' })
export class Discount {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('varchar', { name: 'name', length: 255 })
  @Field()
  name: string;

  @Column('varchar', { name: 'code', nullable: true, length: 255 })
  @Field({ nullable: true })
  code?: string;

  @Column('decimal', {
    name: 'percentage',
    nullable: true,
    precision: 10,
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value?: string) => value && new Decimal(value),
    },
  })
  @Field(() => GraphqlDecimal, { nullable: true })
  percentage?: Decimal;

  @Column('decimal', {
    name: 'maximumDiscount',
    nullable: true,
    precision: 10,
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value?: string) => value && new Decimal(value),
    },
  })
  @Field(() => GraphqlDecimal, { nullable: true })
  maximumDiscount?: Decimal;

  @Column('decimal', {
    name: 'amount',
    nullable: true,
    precision: 10,
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value?: string) => value && new Decimal(value),
    },
  })
  @Field(() => GraphqlDecimal, { nullable: true })
  amount?: Decimal;

  @Column('datetime', {
    name: 'startDate',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  startDate: Date;

  @Column('datetime', { name: 'endDate', precision: 3 })
  @Field()
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

  isValid = (): boolean => {
    const now = moment.tz('Africa/Cairo');
    const startDiff = now.diff(this.startDate, 'seconds');
    const endDiff = now.diff(this.endDate, 'seconds');
    return startDiff >= 0 && endDiff <= 0;
  };

  @OneToMany(() => Camp, (camp) => camp.discount, { nullable: true })
  @Field(() => [Camp], { nullable: true })
  camps?: Camp[];

  // @ManyToMany(
  //   () => RegistrationHistory,
  //   (registrationHistory) => registrationHistory.discountsApplied,
  //   { nullable: true },
  // )
  // registrationUsage?: RegistrationHistory[];
}
