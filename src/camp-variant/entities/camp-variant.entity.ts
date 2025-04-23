import { ObjectType, Field, Int } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { Camp } from 'src/camp/entities/camp.entity';
import { moneyFixation } from 'support/constants';
import { Decimal, GraphqlDecimal } from 'support/scalars';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@ObjectType()
@Entity('camp-variant', { schema: 'beyond_egypt' })
export class CampVariant {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @Column('int', { name: 'campId' })
  @Field()
  campId: number;

  @Column('varchar', { name: 'name', length: 255 })
  @Field()
  name: string;

  @Column('decimal', {
    name: 'price',
    nullable: true,
    precision: 10,
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value?: string) => value && new Decimal(value),
    },
  })
  @Field(() => GraphqlDecimal, { nullable: true })
  price?: Decimal;

  @Column('int', { name: 'remainingCapacity' })
  @Field()
  remainingCapacity: number;

  @Column('int', { name: 'capacity' })
  @Field()
  capacity: number;

  @Column('datetime', { name: 'startDate' })
  @Field()
  startDate: Date;

  @Column('datetime', { name: 'endDate' })
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

  @ManyToOne(() => Camp, (camp) => camp.campVariants, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'campId', referencedColumnName: 'id' })
  @Field(() => Camp)
  camp: Camp;

  @OneToMany(
    () => CampVariantRegistration,
    (campVariantRegistration) => campVariantRegistration.campVariant,
  )
  @Field(() => [CampVariantRegistration])
  campVariantRegistrations: CampVariantRegistration[];

  // @AfterInsert()s
  // setDefaultCurCapacity() {
  //   if (!this.remainingCapacity) {
  //     this.remainingCapacity = this.capacity;
  //   }
  // }
}
