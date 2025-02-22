import { Field, ObjectType } from '@nestjs/graphql';
import Decimal from 'decimal.js';
import { Camp } from 'src/camp/entities/camp.entity';
import { GraphqlDecimal } from 'support/scalars';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('meal', { schema: 'beyond_egypt' })
@ObjectType()
export class Meal {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('varchar', { name: 'name', length: 255 })
  @Field()
  name: string;

  @Column('decimal', { name: 'price', precision: 10, scale: 2 })
  @Field(() => GraphqlDecimal)
  price: Decimal;

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

  @ManyToMany(() => Camp, (camp) => camp.meals, { nullable: true })
  camps?: Camp[];
}
