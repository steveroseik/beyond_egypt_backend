import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@ObjectType()
@Entity('registration-reserve', { schema: 'beyond_egypt' })
export class RegistrationReserve {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('int', { name: 'campRegistrationId' })
  @Field(() => Int)
  campRegistrationId: number;

  @Column('int', { name: 'campVariantId' })
  @Field(() => Int)
  campVariantId: number;

  @Column('int', { name: 'count' })
  @Field(() => Int)
  count: number;

  @Column('int', { name: 'paymentId' })
  @Field(() => Int)
  paymentId: number;

  @Column('varchar', { name: 'userId' })
  @Field(() => String)
  userId: string;

  @Column('timestamp', {
    name: 'expirationDate',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  expirationDate: Date;

  @CreateDateColumn({
    precision: 3,
    name: 'createdAt',
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  createdAt: Date;
}
