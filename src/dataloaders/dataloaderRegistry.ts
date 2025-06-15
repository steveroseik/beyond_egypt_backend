import { MealService } from 'src/meal/meal.service';
// import { MealsLoader } from './loaders/meals.loader';
import { FilesLoader } from './loaders/files.loader';
import { FileService } from 'src/file/file.service';
import CampVariantsByCampDataLoader from './loaders/campVariantsByCamp.loader';
import { CampVariantService } from 'src/camp-variant/camp-variant.service';
import { LocationService } from 'src/location/location.service';
import { Location } from 'src/location/entities/location.entity';
import { LocationsDataLoader } from './loaders/location.loader';
import CampFilesDataLoader from './loaders/campFiles.loaders';
import { CampVariantsDataLoader } from './loaders/campVariants.loader';
import { ChildDataLoader } from './loaders/child.loader';
import { ParentAdditionalDataLoader } from './loaders/parentAdditional.loader';
import { ChildService } from 'src/child/child.service';
import { ParentAdditionalService } from 'src/parent-additional/parent-additional.service';
import { ChildByParentDataLoader } from './loaders/childByParent.loader';
import CampVariantRegistrationsDataLoader from './loaders/CampVariantRegistrations.loader';
import { CampVariantRegistrationService } from 'src/camp-variant-registration/camp-variant-registration.service';
import { CampService } from 'src/camp/camp.service';
import EventCampsDataLoader from './loaders/eventCampsDataLoader';
import EventFilesDataLoader from './loaders/eventFiles.loader';
import { CampsDataLoader } from './loaders/camps.loader';
import { EventsDataLoader } from './loaders/events.dataloader';
import { EventService } from 'src/event/event.service';
import { AgeRangeService } from 'src/age-range/age-range.service';
import AgeRangesByCampDataLoader from './loaders/ageRangesByCamp.loader';
import { AllergyService } from 'src/allergy/allergy.service';
import AllergiesByChildDataLoader from './loaders/allergiesByChild.loader';
import { UserService } from 'src/user/user.service';
import { UsersDataLoader } from './loaders/users.loader';
import { DiscountsDataLoader } from './loaders/discounts.loader';
import { DiscountService } from 'src/discount/discount.service';
import { CampRegistrationDataLoader } from './loaders/campRegistration.loader';
import { CampRegistrationService } from 'src/camp-registration/camp-registration.service';
import { CampsWithDeleteDataLoader } from './loaders/campsWithDelete.loader';
import { LatestChildReportHistoryLoader } from './loaders/childReportHistory.loader';
import { ChildReportHistoryService } from 'src/child-report-history/child-report-history.service';
import ChildReportHistoryFilesDataLoader from './loaders/childReportHistoryFiles.loader';

export class DataloaderRegistry {
  private cache: Record<string, any> = {};

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
    private childReportHistoryService: ChildReportHistoryService,
  ) {}

  /**
   * Fetches a memoized service based on a string key, or invokes fallback to create one.
   */
  private get<T>(key: string, fallback: () => T): T {
    if (!this.cache[key]) {
      this.cache[key] = fallback();
    }
    return this.cache[key];
  }

  // public get MealsLoader() {
  //   return this.get('MealsLoader', () => MealsLoader.create(this.mealService));
  // }

  public get FilesLoader() {
    console.log('HEREE');
    return this.get('FilesLoader', () => FilesLoader.create(this.fileService));
  }

  public get CampVariantsByCampDataLoader() {
    return this.get('CampVariantsByCampDataLoader', () =>
      CampVariantsByCampDataLoader.create(this.campVariantService),
    );
  }

  CampVariantsDataLoader({ withDeleted = false }: { withDeleted: boolean }) {
    if (withDeleted) {
      return this.get('CampVariantsDataLoaderWD', () =>
        CampVariantsDataLoader.create(this.campVariantService, true),
      );
    } else {
      return this.get('CampVariantsDataLoaderND', () =>
        CampVariantsDataLoader.create(this.campVariantService, false),
      );
    }
  }

  public get LocationsLoader() {
    return this.get('LocationsLoader', () =>
      LocationsDataLoader.create(this.locationService),
    );
  }

  public get CampFilesDataLoader() {
    return this.get('CampFilesDataLoader', () =>
      CampFilesDataLoader.create(this.fileService),
    );
  }

  public get ChildDataLoader() {
    return this.get('ChildDataLoader', () =>
      ChildDataLoader.create(this.childService),
    );
  }

  public get ParentAdditionalDataLoader() {
    return this.get('ParentAdditionalDataLoader', () =>
      ParentAdditionalDataLoader.create(this.parentAdditionalService),
    );
  }

  public get ChildReportHistoryFilesDataLoader() {
    return this.get('ChildReportHistoryFilesDataLoader', () =>
      ChildReportHistoryFilesDataLoader.create(this.fileService),
    );
  }

  public get ChildByParentDataLoader() {
    return this.get('ChildByParentDataLoader', () =>
      ChildByParentDataLoader.create(this.childService),
    );
  }

  public get CampVariantRegistrationsDataLoader() {
    return this.get('CampVariantRegistrationsDataLoader', () =>
      CampVariantRegistrationsDataLoader.create(
        this.campVariantRegistrationService,
      ),
    );
  }

  public get EventCampsDataLoader() {
    return this.get('EventCampsDataLoader', () =>
      EventCampsDataLoader.create(this.campService),
    );
  }

  public get EventFilesDataLoader() {
    return this.get('EventFilesDataLoader', () =>
      EventFilesDataLoader.create(this.fileService),
    );
  }

  public CampsDataLoader({ withDelete = false }: { withDelete: boolean }) {
    return withDelete
      ? this.get('CampsDataLoader', () =>
          CampsWithDeleteDataLoader.create(this.campService),
        )
      : this.get('CampsDataLoader', () =>
          CampsDataLoader.create(this.campService),
        );
  }

  public get EventsDataLoader() {
    return this.get('EventsDataLoader', () =>
      EventsDataLoader.create(this.eventService),
    );
  }

  public get AgeRangesByCampDataLoader() {
    return this.get('AgeRangesByCampDataLoader', () =>
      AgeRangesByCampDataLoader.create(this.ageRangeService),
    );
  }

  public get AllergiesByChildDataLoader() {
    return this.get('AllergiesByChildDataLoader', () =>
      AllergiesByChildDataLoader.create(this.allergyService),
    );
  }

  public get UsersDataLoader() {
    return this.get('UsersDataLoader', () =>
      UsersDataLoader.create(this.userService),
    );
  }

  public get DiscountsDataLoader() {
    return this.get('DiscountsDataLoader', () =>
      DiscountsDataLoader.create(this.discountService),
    );
  }

  public get CampRegistrationDataLoader() {
    return this.get('CampRegistrationDataLoader', () =>
      CampRegistrationDataLoader.create(this.campRegistrationService),
    );
  }

  public get latestChildReportHistoryDataLoader() {
    return this.get('LatestChildReportHistoryDataLoader', () =>
      LatestChildReportHistoryLoader.create(this.childReportHistoryService),
    );
  }

  /**
   * Just a pretty type-safe facade for invoking `this.get`.
   * Make more of your own as you wish.
   */
}
