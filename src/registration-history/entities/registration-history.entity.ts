import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Discount } from 'src/discount/entities/discount.entity';
import { CampRegistrationStatus } from 'support/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('registration-history', { schema: 'beyond_egypt' })
export class RegistrationHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { name: 'campRegistrationId' })
  @Field()
  campRegistrationId: number;

  @Column('enum', {
    name: 'status',
    nullable: true,
    enum: CampRegistrationStatus,
  })
  @Field(() => CampRegistrationStatus)
  status: CampRegistrationStatus;

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

  // @ManyToMany(() => Discount, (discount) => discount.registrationUsage, {
  //   nullable: true,
  // })
  // @JoinTable({
  //   name: 'camp-registration-discount',
  //   joinColumn: {
  //     name: 'registration-history',
  //     referencedColumnName: 'id',
  //   },
  //   inverseJoinColumn: {
  //     name: 'discount',
  //     referencedColumnName: 'id',
  //   },
  // })
  // @Field(() => [Discount], { nullable: true })
  // discountsApplied?: Discount[];
}
