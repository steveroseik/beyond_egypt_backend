import { SetMetadata } from '@nestjs/common';

export const RequiresWebToken = () => SetMetadata('requiresWebToken', true);
