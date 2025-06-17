import { ObjectType, Field } from '@nestjs/graphql';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { Child } from 'src/child/entities/child.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('registration-attendance', { schema: 'beyond_egypt' })
export class RegistrationAttendance {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('int', { name: 'campRegistrationId' })
  @Field()
  campRegistrationId: number;

  @Column('int', { name: 'campVariantId' })
  @Field()
  campVariantId: number;

  @Column('int', { name: 'childId' })
  @Field()
  childId: number;

  @Column('datetime', { name: 'enterTime' })
  @Field()
  enterTime: Date;

  @Column('datetime', { name: 'leaveTime', nullable: true })
  @Field({ nullable: true })
  leaveTime?: Date;

  @Column('varchar', { name: 'enterAuditorId' })
  @Field()
  enterAuditorId: string;

  @Column('varchar', { name: 'leaveAuditorId', nullable: true })
  @Field({ nullable: true })
  leaveAuditorId?: string;

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

  @ManyToOne(() => Child, (child) => child.attendances, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @Field(() => Child)
  child: Child;

  @ManyToOne(() => CampVariant, (campVariant) => campVariant.attendances, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  // @Field(() => CampVariant)
  campVariant: CampVariant;
}
