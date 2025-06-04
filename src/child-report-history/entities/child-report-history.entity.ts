import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ChildReport } from 'src/child-report/entities/child-report.entity';
import { File } from 'src/file/entities/file.entity';
import { ChildReportStatus } from 'support/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@ObjectType()
@Entity('child-report-history', { schema: 'beyond_egypt' })
export class ChildReportHistory {
  @PrimaryGeneratedColumn()
  @Field(() => Int)
  id: number;

  @Column()
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

  @Column('text', { name: 'actionsTaken' })
  @Field()
  actionsTaken: string;

  @Column('enum', {
    name: 'status',
    enum: ChildReportStatus,
  })
  @Field(() => ChildReportStatus)
  status: ChildReportStatus;

  @Column('varchar', { name: 'reporterId' })
  @Field()
  reporterId: String;

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

  @ManyToMany(() => File, (file) => file.childReportHistories, {
    onDelete: 'CASCADE',
  })
  @JoinTable({
    name: 'child-report-file',
    inverseJoinColumn: {
      name: 'id',
      referencedColumnName: 'id',
    },
    joinColumn: {
      name: 'childReportId',
      referencedColumnName: 'id',
    },
  })
  @Field(() => [File], { nullable: true })
  files?: File[];
}
