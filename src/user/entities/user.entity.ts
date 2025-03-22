import { ObjectType, Field, Int } from '@nestjs/graphql';
import { UserType } from 'support/enums';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('user', { schema: 'beyond_egypt' })
export class User {
  @PrimaryColumn()
  @Field()
  id: string;

  @Column('varchar', { name: 'name', length: 255 })
  @Field()
  name: string;

  @Column('enum', {
    name: 'type',
    enum: UserType,
  })
  @Field(() => UserType)
  type: UserType;

  @Column('varchar', { name: 'email', length: 100, unique: true })
  @Field()
  email: string;

  @Column('varchar', { name: 'phone', nullable: true, length: 20 })
  @Field({ nullable: true })
  phone?: string;

  @Column('varchar', { name: 'district', nullable: true, length: 255 })
  @Field({ nullable: true })
  district?: string;

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
}
