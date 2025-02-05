import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { DiscountService } from './discount.service';
import { Discount } from './entities/discount.entity';
import { CreateDiscountInput } from './dto/create-discount.input';
import { UpdateDiscountInput } from './dto/update-discount.input';

@Resolver(() => Discount)
export class DiscountResolver {
  constructor(private readonly discountService: DiscountService) {}

  @Mutation(() => Discount)
  createDiscount(@Args('createDiscountInput') createDiscountInput: CreateDiscountInput) {
    return this.discountService.create(createDiscountInput);
  }

  @Query(() => [Discount], { name: 'discount' })
  findAll() {
    return this.discountService.findAll();
  }

  @Query(() => Discount, { name: 'discount' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.discountService.findOne(id);
  }

  @Mutation(() => Discount)
  updateDiscount(@Args('updateDiscountInput') updateDiscountInput: UpdateDiscountInput) {
    return this.discountService.update(updateDiscountInput.id, updateDiscountInput);
  }

  @Mutation(() => Discount)
  removeDiscount(@Args('id', { type: () => Int }) id: number) {
    return this.discountService.remove(id);
  }
}
