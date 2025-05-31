import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ChildReport } from 'src/child-report/entities/child-report.entity';
import { ChildReportStatus } from 'support/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@ObjectType()
@Entity('child-report-history', { schema: 'beyond_egypt' })
export class ChildReportHistory {
  @PrimaryColumn()
  @Field()
  childReportId: number;

  @Column('datetime', {
    name: 'reportTime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  reportTime: Date;

  @Column('varchar', { nullable: true, name: 'gameName', length: 255 })
  @Field({ nullable: true })
  gameName?: string;

  @Column('text', { name: 'details' })
  @Field()
  details: string;

  @Column('text', { name: 'details' })
  @Field()
  actionsTaken: string;

  @Column('enum', {
    name: 'status',
    enum: ChildReportStatus,
  })
  @Field(() => ChildReportStatus)
  status: ChildReportStatus;

  @Column('int', { name: 'reporterId' })
  @Field()
  reporterId: number;

  @CreateDateColumn({
    name: 'createdAt',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  createdAt: Date;

  @ManyToOne(() => ChildReport, (childReport) => childReport.history, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'childReportId' })
  @Field(() => ChildReport)
  childReport: ChildReport;
}
