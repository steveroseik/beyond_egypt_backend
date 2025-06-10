import { ObjectType, Field, Int } from '@nestjs/graphql';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { ChildReportHistory } from 'src/child-report-history/entities/child-report-history.entity';
import { Child } from 'src/child/entities/child.entity';

import { ChildReportStatus, ChildReportType } from 'support/enums';
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
@Entity('child-report', { schema: 'beyond_egypt' })
export class ChildReport {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('int', { name: 'childId' })
  @Field()
  childId: number;

  @Column('int', { name: 'campVariantId' })
  @Field()
  campVariantId: number;

  @Column('enum', {
    name: 'type',
    nullable: true,
    enum: ChildReportType,
    default: ChildReportType.incident,
  })
  @Field(() => ChildReportType)
  type: ChildReportType;

  @Column('enum', {
    name: 'status',
    nullable: true,
    enum: ChildReportStatus,
  })
  @Field(() => ChildReportStatus)
  status: ChildReportStatus;

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

  @OneToMany(() => ChildReportHistory, (history) => history.childReport)
  // @Field(() => [ChildReportHistory])
  history: ChildReportHistory[];

  @ManyToOne(() => Child, (child) => child.reports, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'childId' })
  @Field(() => Child, { nullable: true })
  child?: Child;

  @ManyToOne(() => CampVariant, (campVariant) => campVariant.childReports, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'campVariantId' })
  @Field(() => CampVariant, { nullable: true })
  campVariant?: CampVariant;
}
