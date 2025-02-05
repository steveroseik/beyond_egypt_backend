import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ChildReportStatus, ChildReportType } from 'support/enums';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
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
}
