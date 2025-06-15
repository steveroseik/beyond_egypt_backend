import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Allergy } from 'src/allergy/entities/allergy.entity';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { ChildReport } from 'src/child-report/entities/child-report.entity';
import { RegistrationAttendance } from 'src/registration-attendance/entities/registration-attendance.entity';
import { User } from 'src/user/entities/user.entity';
import { ParentRelation } from 'support/enums';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
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

  @Column('int', { name: 'schoolId', nullable: true })
  @Field({ nullable: true })
  schoolId?: number;

  @Column('int', { name: 'imageId', nullable: true })
  @Field({ nullable: true })
  imageId?: number;

  @Column('varchar', { name: 'schoolName', length: 50, nullable: true })
  @Field({ nullable: true })
  schoolName?: string;

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

  @Column('varchar', { name: 'medicalInfo', nullable: true, length: 255 })
  @Field({ nullable: true })
  medicalInfo?: string;

  @Column('varchar', { name: 'otherAllergies', nullable: true, length: 255 })
  @Field({ nullable: true })
  otherAllergies?: string;

  @Column('varchar', { name: 'extraNotes', nullable: true, length: 255 })
  @Field({ nullable: true })
  extraNotes?: string;

  @Column('bit', {
    name: 'canTakePhotos',
    default: false,
    transformer: {
      to: (value: boolean) => value,
      from: (value: Buffer) => value && value[0] === 1,
    },
  })
  @Field()
  canTakePhotos: boolean;

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

  @ManyToMany(() => Allergy, (allergy) => allergy.children)
  @JoinTable({
    name: 'child-allergy',
    joinColumn: {
      name: 'childId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'allergyId',
      referencedColumnName: 'id',
    },
  })
  @Field(() => [Allergy])
  allergies: Allergy[];

  @OneToMany(
    () => CampVariantRegistration,
    (registration) => registration.child,
    { nullable: true },
  )
  @Field(() => [CampVariantRegistration], { nullable: true })
  campVariantRegistrations?: CampVariantRegistration[];

  @ManyToOne(() => User, (user) => user.children, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId', referencedColumnName: 'id' })
  @Field(() => User)
  user: User;

  @OneToMany(() => ChildReport, (childReport) => childReport.child, {
    nullable: true,
  })
  @Field(() => [ChildReport], { nullable: true })
  reports?: ChildReport[];

  @OneToMany(() => RegistrationAttendance, (attendance) => attendance.child, {
    nullable: true,
  })
  attendances?: RegistrationAttendance[];
}
