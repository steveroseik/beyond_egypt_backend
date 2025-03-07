import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Camp } from 'src/camp/entities/camp.entity';
import { GraphqlPoint } from 'support/scalars';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('location', { schema: 'beyond_egypt' })
export class Location {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('varchar', { name: 'name', length: 50 })
  @Field()
  name: string;

  @Column('point', { name: 'geoPoint', nullable: true })
  @Field(() => GraphqlPoint, { nullable: true })
  geoPoint: JSON;

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

  @OneToMany(() => Camp, (camp) => camp.location, { nullable: true })
  @Field(() => [Camp], { nullable: true })
  camps?: Camp[];
}
