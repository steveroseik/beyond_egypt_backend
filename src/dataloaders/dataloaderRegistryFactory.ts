import { Injectable } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';

@Injectable()
export class DataloaderRegistryFactory {
  constructor() {}

  public create() {
    return new DataloaderRegistry();
  }
}
