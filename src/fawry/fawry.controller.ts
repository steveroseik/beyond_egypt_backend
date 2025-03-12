import { Controller, Get, Query } from '@nestjs/common';
import { FawryService } from './fawry.service';
import { FawryReturnDto } from './models/fawry-return.dto';

@Controller('fawry')
export class FawryController {
  constructor(private readonly fawryService: FawryService) {}

  @Get('return')
  handleReturn(@Query() query: FawryReturnDto) {
    // Log the received query payload for debugging
    console.log('Fawry return payload:', query);

    // Process the payload as needed, for example:
    // - Verify the signature
    // - Update order status in your database
    // - Trigger any business logic based on orderStatus or paymentMethod

    // For demonstration, we'll simply return a confirmation message with the received data.
    return {
      message: 'Action processed successfully',
      data: query,
    };
  }
}
