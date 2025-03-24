import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('parent-additional', { schema: 'beyond_egypt' })
export class ParentAdditional {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column({ name: 'userId' })
  @Field()
  userId: string;

  @Column('varchar', { name: 'name', length: 255 })
  @Field()
  name: string;

  @Column('varchar', { name: 'email', nullable: true, length: 30 })
  @Field({ nullable: true })
  email: string;

  @Column('varchar', { name: 'phone', length: 20 })
  @Field()
  phone: string;

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

  @ManyToOne(() => User, (user) => user.parentAdditionals, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'userId', referencedColumnName: 'id' }])
  @Field(() => User)
  user: User;
}
