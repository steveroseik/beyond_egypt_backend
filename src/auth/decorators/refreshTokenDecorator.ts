import { SetMetadata } from '@nestjs/common';

export const RequiresRefreshToken = () => [
  SetMetadata('requiresRefreshToken', true),
  SetMetadata('requiresWebToken', true),
];
