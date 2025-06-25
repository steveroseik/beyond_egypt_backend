import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MailService } from './mail.service';
import { GraphQLJSONObject } from 'graphql-type-json';

@Resolver()
export class MailResolver {
  constructor(private readonly mailService: MailService) {}

  @Mutation(() => GraphQLJSONObject)
  sendCampRegistrationEmailConfirmation(
    @Args('campRegistrationId') campRegistrationId: number,
  ): Promise<boolean> {
    return this.mailService.sendCampRegistrationConfirmation(
      campRegistrationId,
    );
  }
}
