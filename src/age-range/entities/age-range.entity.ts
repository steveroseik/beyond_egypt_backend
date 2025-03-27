import { Field, ObjectType } from '@nestjs/graphql';
import { Camp } from 'src/camp/entities/camp.entity';
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

@Entity('age-range', { schema: 'beyond_egypt' })
@ObjectType()
export class AgeRange {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('varchar', { name: 'name', nullable: true, length: 255 })
  @Field({ nullable: true })
  name?: string;

  @Column('int', { name: 'thumbnailId', nullable: true })
  @Field({ nullable: true })
  thumbnailId?: number;

  @Column('int', { name: 'minAge', nullable: true })
  @Field({ nullable: true })
  minAge?: number;

  @Column('int', { name: 'maxAge', nullable: true })
  @Field({ nullable: true })
  maxAge?: number;

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

  @ManyToMany(() => Camp, (camp) => camp.ageRanges, { nullable: true })
  @Field(() => [Camp], { nullable: true })
  camps?: Camp[];
}
