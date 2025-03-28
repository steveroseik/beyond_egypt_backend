import * as DataLoader from 'dataloader';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';

export class UsersDataLoader {
  public static create(service: UserService) {
    return new DataLoader<string, User>(async (keys: readonly string[]) => {
      const data = await service.findAllByKeys(keys);
      return keys.map((key) => data.find((file) => file.id === key));
    });
  }
}
