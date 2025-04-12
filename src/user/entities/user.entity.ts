import { ObjectType, Field, Int } from '@nestjs/graphql';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { Child } from 'src/child/entities/child.entity';
import { ParentAdditional } from 'src/parent-additional/entities/parent-additional.entity';
import { UserType } from 'support/enums';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
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

  @Column('varchar', { name: 'emergencyContact', nullable: true, length: 20 })
  @Field({ nullable: true })
  emergencyPhone?: string;

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

  @OneToMany(() => Child, (child) => child.user)
  @Field(() => [Child])
  children: Child[];

  @OneToMany(
    () => ParentAdditional,
    (parentAdditional) => parentAdditional.user,
  )
  @Field(() => [ParentAdditional])
  parentAdditionals: ParentAdditional[];

  @OneToMany(
    () => CampRegistration,
    (campRegistration) => campRegistration.parent,
  )
  @Field(() => [CampRegistration])
  campRegistrations: CampRegistration[];
}
