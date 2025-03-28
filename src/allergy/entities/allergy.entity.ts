import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Child } from 'src/child/entities/child.entity';
import { AllergyCategory } from 'support/enums';
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

@Entity('allergy', { schema: 'beyond_egypt' })
@ObjectType()
export class Allergy {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('varchar', { name: 'nameEn', length: 255 })
  @Field()
  nameEn: string;

  @Column('varchar', { name: 'nameAr', length: 255 })
  @Field()
  nameAr: string;

  @Column('enum', {
    name: 'category',
    enum: AllergyCategory,
  })
  @Field(() => AllergyCategory)
  category: AllergyCategory;

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

  @ManyToMany(() => Child, (child) => child.allergies, { nullable: true })
  @Field(() => [Child], { nullable: true })
  children?: Child[];
}
