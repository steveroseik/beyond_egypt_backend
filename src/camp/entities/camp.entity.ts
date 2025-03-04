import { ObjectType, Field, Int } from '@nestjs/graphql';
import { AgeRange } from 'src/age-range/entities/age-range.entity';
import { File } from 'src/file/entities/file.entity';
import { Meal } from 'src/meal/entities/meal.entity';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('camp', { schema: 'beyond_egypt' })
@ObjectType()
export class Camp {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('varchar', { name: 'name', length: 255 })
  @Field()
  name: string;

  @Column('varchar', { name: 'description', nullable: true, length: 255 })
  @Field({ nullable: true })
  description?: string;

  @Column('int', { name: 'thumbnailId' })
  @Field()
  thumbnailId: number;

  @Column('decimal', {
    name: 'defaultPrice',
    nullable: true,
    precision: 10,
    scale: 0,
  })
  @Field({ nullable: true })
  defaultPrice?: string;

  @Column('bit', {
    name: 'hasShirts',
    default: false,
    transformer: {
      to: (value: boolean) => value,
      from: (value: Buffer) => value && value[0] === 1,
    },
  })
  @Field()
  hasShirts: boolean;

  @Column('int', { name: 'eventId', nullable: true })
  @Field({ nullable: true })
  eventId?: number;

  @Column('bit', {
    name: 'isPrivate',
    default: false,
    transformer: {
      to: (value: boolean) => value,
      from: (value: Buffer) => value && value[0] === 1,
    },
  })
  @Field()
  isPrivate: boolean;

  @Column('int', { name: 'defaultCapacity', nullable: true })
  @Field({ nullable: true })
  defaultCapacity?: number;

  @Column('int', { name: 'locationId' })
  @Field()
  locationId: number;

  @Column('int', { name: 'discountId', nullable: true })
  @Field()
  discountId?: number;

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

  @ManyToMany(() => AgeRange, (ageRange) => ageRange.camps)
  @JoinTable({
    name: 'camp-age-range',
    inverseJoinColumn: {
      name: 'age-range',
      referencedColumnName: 'id',
    },
    joinColumn: {
      name: 'camp',
      referencedColumnName: 'id',
    },
  })
  @Field(() => [AgeRange], { nullable: true })
  ageRanges?: AgeRange[];

  @ManyToMany(() => File, (file) => file.camps)
  @JoinTable({
    name: 'camp-file',
    inverseJoinColumn: {
      name: 'file',
      referencedColumnName: 'id',
    },
    joinColumn: {
      name: 'camp',
      referencedColumnName: 'id',
    },
  })
  @Field(() => [File], { nullable: true })
  files?: File[];

  @ManyToMany(() => Meal, (meal) => meal.camps)
  @JoinTable({
    name: 'camp-meal',
    inverseJoinColumn: {
      name: 'meal',
      referencedColumnName: 'id',
    },
    joinColumn: {
      name: 'camp',
      referencedColumnName: 'id',
    },
  })
  @Field(() => [Meal], { nullable: true })
  meals?: Meal[];
}
