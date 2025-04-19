import * as DataLoader from 'dataloader';
import { DiscountService } from 'src/discount/discount.service';
import { Discount } from 'src/discount/entities/discount.entity';

export class DiscountsDataLoader {
  public static create(service: DiscountService) {
    return new DataLoader<number, Discount>(async (keys: readonly number[]) => {
      const data = await service.findAllByKeys(keys);
      return keys.map((key) => data.find((discount) => discount.id === key));
    });
  }
}
