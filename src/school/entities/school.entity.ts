import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  AfterRemove,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity({ name: 'school', schema: 'beyond_egypt' })
export class School {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Field()
  @Column('varchar', { name: 'nameEn', length: 150 })
  nameEn: string;

  @Field()
  @Column('varchar', { name: 'nameAr', length: 150 })
  nameAr: string;

  @Column('varchar', { name: 'imageKey', nullable: true })
  @Field({ nullable: true })
  imageKey?: string;

  @CreateDateColumn({
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    name: 'createdAt',
  })
  @Field()
  createdAt: Date;

  @UpdateDateColumn({
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
    name: 'lastModified',
  })
  @Field()
  lastModified: Date;

  // @AfterRemove()
  // async afterRemove() {
  //   if (this.key != null)

  // }
}
