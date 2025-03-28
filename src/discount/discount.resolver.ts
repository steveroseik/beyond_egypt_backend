import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { DiscountService } from './discount.service';
import { Discount } from './entities/discount.entity';
import { CreateDiscountInput } from './dto/create-discount.input';
import { UpdateDiscountInput } from './dto/update-discount.input';
import { GraphQLJSONObject } from 'graphql-type-json';
import { DiscountsPage } from './entities/discounts-page.entity';
import { PaginateDiscountsInput } from './dto/paginate-discounts.input';

@Resolver(() => Discount)
export class DiscountResolver {
  constructor(private readonly discountService: DiscountService) {}

  @Mutation(() => GraphQLJSONObject)
  createDiscount(@Args('input') input: CreateDiscountInput) {
    return this.discountService.create(input);
  }

  @Query(() => Discount, { nullable: true })
  findOneDiscount(@Args('id', { type: () => Int }) id: number) {
    return this.discountService.findOne(id);
  }

  @Query(() => DiscountsPage)
  paginateDiscounts(@Args('input') input: PaginateDiscountsInput) {
    return this.discountService.paginate(input);
  }

  @Mutation(() => GraphQLJSONObject)
  updateDiscount(@Args('input') input: UpdateDiscountInput) {
    return this.discountService.update(input);
  }

  @Mutation(() => GraphQLJSONObject)
  removeDiscount(@Args('ids', { type: () => [Int] }) ids: number[]) {
    return this.discountService.remove(ids);
  }
}
