import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { ChildService } from './child.service';
import { Child } from './entities/child.entity';
import { CreateChildInput } from './dto/create-child.input';
import { UpdateChildInput } from './dto/update-child.input';
import { ChildPage } from './entities/child-page.entity';
import { PaginateChildrenInput } from './dto/paginate-children.input';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { User } from 'src/user/entities/user.entity';
import { GraphQLJSONObject } from 'graphql-type-json';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { File } from 'src/file/entities/file.entity';
import { Allergy } from 'src/allergy/entities/allergy.entity';

@Resolver(() => Child)
export class ChildResolver {
  constructor(private readonly childService: ChildService) {}

  @Mutation(() => GraphQLJSONObject)
  updateChild(
    @Args('input') input: UpdateChildInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') userType: UserType,
  ) {
    return this.childService.update(input, userId, userType);
  }

  @Query(() => ChildPage)
  paginateChildren(
    @Args('input') input: PaginateChildrenInput,
    @CurrentUser('type') type: UserType,
    @CurrentUser('id') id: string,
  ) {
    if (type == UserType.parent) {
      input.parentId = id;
    }
    return this.childService.paginate(input);
  }

  @ResolveField(() => File, { nullable: true })
  file(
    @Parent() child: Child,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return child.imageId ? loaders.FilesLoader.load(child.imageId) : null;
  }

  @ResolveField(() => [Allergy], { nullable: true })
  allergies(
    @Parent() child: Child,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return child.allergies ?? loaders.AllergiesByChildDataLoader.load(child.id);
  }
}
