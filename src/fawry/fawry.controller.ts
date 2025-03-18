import { Controller, Get, Query, Res } from '@nestjs/common';
import { FawryService } from './fawry.service';
import { FawryReturnDto } from './models/fawry-return.dto';
import { Public } from 'src/auth/decorators/publicDecorator';
import { Response } from 'express';

@Controller()
export class FawryController {
  constructor(private readonly fawryService: FawryService) {}

  @Public()
  @Get('return')
  handleReturn(@Query() query: FawryReturnDto, @Res() res: Response) {
    return this.fawryService.handleReturn(query, res);
  }
}
