import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity('settings', { schema: 'beyond_egypt' })
export class Settings {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('int', { name: 'sizeChartFileId', nullable: true })
  @Field({ nullable: true })
  sizeChartFileId?: number;

  @Column('varchar', { name: 'coachForm', nullable: true, length: 255 })
  @Field({ nullable: true })
  coachForm?: string;
}
