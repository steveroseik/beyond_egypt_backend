import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Camp } from 'src/camp/entities/camp.entity';
import { ChildReportHistory } from 'src/child-report-history/entities/child-report-history.entity';
import { ChildReport } from 'src/child-report/entities/child-report.entity';
import { Event } from 'src/event/entities/event.entity';
import { FileType } from 'support/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('file', { schema: 'beyond_egypt' })
@ObjectType()
export class File {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  @Field(() => Int)
  id: number;

  @Column('varchar', { name: 'name', length: 40 })
  @Field()
  name: string;

  @Column('enum', { name: 'type', enum: FileType })
  @Field(() => FileType)
  type: FileType;

  @Column('varchar', { name: 'key', length: 255 })
  @Field()
  key: string;

  @Column('varchar', { name: 'userId' })
  @Field()
  userId: string;

  @Column('int', { name: 'sizeInKb' })
  @Field(() => Int)
  sizeInKb: number;

  @CreateDateColumn({
    name: 'createdAt',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  @Field()
  createdAt: Date;

  @ManyToMany(() => Camp, (camp) => camp.files, { nullable: true })
  camps?: Camp[];

  @ManyToMany(() => Event, (event) => event.files, { nullable: true })
  events?: Event[];

  @ManyToMany(() => ChildReportHistory, (history) => history.files, {
    nullable: true,
  })
  childReportHistories?: ChildReportHistory[];
}
