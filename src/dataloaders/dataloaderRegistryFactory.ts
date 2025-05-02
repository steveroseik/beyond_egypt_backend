import { Injectable } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';
import { MealService } from 'src/meal/meal.service';
import { FileService } from 'src/file/file.service';
import { CampVariantService } from 'src/camp-variant/camp-variant.service';
import { LocationService } from 'src/location/location.service';
import { ChildService } from 'src/child/child.service';
import { ParentAdditionalService } from 'src/parent-additional/parent-additional.service';
import { CampVariantRegistrationService } from 'src/camp-variant-registration/camp-variant-registration.service';
import { CampService } from 'src/camp/camp.service';
import { EventService } from 'src/event/event.service';
import { AgeRangeService } from 'src/age-range/age-range.service';
import { AllergyService } from 'src/allergy/allergy.service';
import { UserService } from 'src/user/user.service';
import { DiscountService } from 'src/discount/discount.service';
import { CampRegistrationService } from 'src/camp-registration/camp-registration.service';

@Injectable()
export class DataloaderRegistryFactory {
  constructor(
    private mealService: MealService,
    private fileService: FileService,
    private campVariantService: CampVariantService,
    private locationService: LocationService,
    private childService: ChildService,
    private parentAdditionalService: ParentAdditionalService,
    private campVariantRegistrationService: CampVariantRegistrationService,
    private campService: CampService,
    private eventService: EventService,
    private ageRangeService: AgeRangeService,
    private allergyService: AllergyService,
    private userService: UserService,
    private discountService: DiscountService,
    private campRegistrationService: CampRegistrationService,
  ) {}

  public create() {
    return new DataloaderRegistry(
      this.mealService,
      this.fileService,
      this.campVariantService,
      this.locationService,
      this.childService,
      this.parentAdditionalService,
      this.campVariantRegistrationService,
      this.campService,
      this.eventService,
      this.ageRangeService,
      this.allergyService,
      this.userService,
      this.discountService,
      this.campRegistrationService,
    );
  }
}
