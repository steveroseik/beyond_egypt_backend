import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Camp } from 'src/camp/entities/camp.entity';
import { File } from 'src/file/entities/file.entity';
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
@Entity('event', { schema: 'beyond_egypt' })
export class Event {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('varchar', { name: 'name', length: 255 })
  @Field()
  name: string;

  @Column('varchar', { name: 'description', length: 255 })
  @Field()
  description: string;

  @Column('int', { name: 'thumbnailId' })
  @Field()
  thumbnailId: number;

  @Column('datetime', { name: 'startDate', precision: 3 })
  @Field()
  startDate: Date;

  @Column('datetime', { name: 'endDate', precision: 3 })
  @Field()
  endDate: Date;

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

  @Column('int', { name: 'earlyBirdId', nullable: true })
  @Field({ nullable: true })
  earlyBirdId?: number;

  @ManyToMany(() => File, (file) => file.events)
  @JoinTable({
    name: 'event-file',
    inverseJoinColumn: {
      name: 'event',
      referencedColumnName: 'id',
    },
    joinColumn: {
      name: 'file',
      referencedColumnName: 'id',
    },
  })
  @Field(() => [File])
  files: File[];

  @OneToMany(() => Camp, (camp) => camp.event, { nullable: true })
  @Field(() => [Camp], { nullable: true })
  camps?: Camp[];
}
