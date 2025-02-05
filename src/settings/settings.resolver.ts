import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { SettingsService } from './settings.service';
import { Settings } from './entities/setting.entity';
import { CreateSettingInput } from './dto/create-setting.input';
import { UpdateSettingInput } from './dto/update-setting.input';

@Resolver(() => Settings)
export class SettingsResolver {
  constructor(private readonly settingsService: SettingsService) {}

  @Mutation(() => Settings)
  createSetting(
    @Args('createSettingInput') createSettingInput: CreateSettingInput,
  ) {
    return this.settingsService.create(createSettingInput);
  }

  @Query(() => [Settings], { name: 'settings' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Query(() => Settings, { name: 'setting' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.settingsService.findOne(id);
  }

  @Mutation(() => Settings)
  updateSetting(
    @Args('updateSettingInput') updateSettingInput: UpdateSettingInput,
  ) {
    return this.settingsService.update(
      updateSettingInput.id,
      updateSettingInput,
    );
  }

  @Mutation(() => Settings)
  removeSetting(@Args('id', { type: () => Int }) id: number) {
    return this.settingsService.remove(id);
  }
}
