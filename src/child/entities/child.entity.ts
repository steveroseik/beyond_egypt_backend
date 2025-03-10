import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Allergy } from 'src/allergy/entities/allergy.entity';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { ParentRelation } from 'support/enums';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('child', { schema: 'beyond_egypt' })
export class Child {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('varchar', { name: 'parentId', length: 255 })
  @Field()
  parentId: string;

  @Column('varchar', { name: 'name', length: 255 })
  @Field()
  name: string;

  @Column('datetime', { name: 'birthdate' })
  @Field()
  birthdate: Date;

  @Column('int', { name: 'schoolId' })
  @Field()
  schoolId: number;

  @Column('bit', {
    name: 'isMale',
    default: false,
    transformer: {
      to: (value: boolean) => value,
      from: (value: Buffer) => value && value[0] === 1,
    },
  })
  @Field()
  isMale: boolean;

  @Column('enum', {
    name: 'parentRelation',
    enum: ParentRelation,
  })
  @Field(() => ParentRelation)
  parentRelation: ParentRelation;

  @Column('int', { name: 'imageFileId', nullable: true })
  @Field({ nullable: true })
  imageFileId?: number;

  @Column('varchar', { name: 'medicalInfo', nullable: true, length: 255 })
  @Field({ nullable: true })
  medicalInfo?: string;

  @Column('varchar', { name: 'otherAllergies', nullable: true, length: 255 })
  @Field({ nullable: true })
  otherAllergies?: string;

  @Column('varchar', { name: 'extraNotes', nullable: true, length: 255 })
  @Field({ nullable: true })
  extraNotes?: string;

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

  @ManyToMany(() => Allergy, (allergy) => allergy.children, { nullable: true })
  @JoinTable({
    name: 'child-allergy',
    joinColumn: {
      name: 'allergy',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'child',
      referencedColumnName: 'id',
    },
  })
  @Field(() => [Allergy], { nullable: true })
  allergies?: Allergy[];

  @OneToMany(
    () => CampVariantRegistration,
    (registration) => registration.child,
  )
  @Field(() => [CampVariantRegistration])
  campVariantRegistrations: CampVariantRegistration[];
}
