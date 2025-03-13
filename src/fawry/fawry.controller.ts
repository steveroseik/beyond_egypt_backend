import { Controller, Get, Query } from '@nestjs/common';
import { FawryService } from './fawry.service';
import { FawryReturnDto } from './models/fawry-return.dto';
import { Public } from 'src/auth/decorators/publicDecorator';

@Controller('fawry')
export class FawryController {
  constructor(private readonly fawryService: FawryService) {}

  @Public()
  @Get('return')
  handleReturn(@Query() query: FawryReturnDto) {
    return this.fawryService.handleReturn(query);
  }
}
