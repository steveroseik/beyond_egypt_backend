import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ChildReportStatus } from 'support/enums';
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity('child-report-history', { schema: 'beyond_egypt' })
export class ChildReportHistory {
  @PrimaryColumn()
  @Field()
  childReportId: number;

  @Column('datetime', { name: 'reportTime' })
  @Field()
  reportTime: Date;

  @Column('varchar', { name: 'gameName', length: 255 })
  @Field()
  gameName: string;

  @Column('varchar', { name: 'details', length: 255 })
  @Field()
  details: string;

  @Column('varchar', { name: 'actionsTaken', length: 255 })
  @Field()
  actionsTaken: string;

  @Column('enum', {
    name: 'status',
    enum: ChildReportStatus,
  })
  @Field(() => ChildReportStatus)
  status: ChildReportStatus;

  @Column('int', { name: 'userId' })
  @Field()
  userId: number;
}
