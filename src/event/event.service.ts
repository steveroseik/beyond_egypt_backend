import { Injectable } from '@nestjs/common';
import { CreateEventInput } from './dto/create-event.input';
import { UpdateEventInput } from './dto/update-event.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { PaginateEventsInput } from './dto/paginate-events.input';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { Event } from './entities/event.entity';
import { RemoveEventInput } from './dto/remove-event.input';
import { Camp } from 'src/camp/entities/camp.entity';
import { CampService } from 'src/camp/camp.service';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import * as moment from 'moment-timezone';
@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private dataSource: DataSource,
  ) {}
  async create(input: CreateEventInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const event = await this.eventRepository.insert(input);

      if (event.raw.affectedRows === 0) {
        throw new Error('No event was created');
      }

      if (input.fileIds?.length) {
        await queryRunner.manager
          .createQueryBuilder(Event, 'event')
          .relation(Event, 'files')
          .of(event.raw.insertId)
          .add(input.fileIds);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Event created successfully',
        data: {
          id: event.raw.insertId,
        },
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Error while creating event',
      };
    } finally {
      await queryRunner.release();
    }
  }

  findAllByKeys(keys: readonly number[]) {
    return this.eventRepository.find({ where: { id: In(keys) } });
  }

  findOne(id: number) {
    return this.eventRepository.findOne({ where: { id } });
  }

  async update(input: UpdateEventInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (input.fileIds?.length) {
        await queryRunner.manager
          .createQueryBuilder(Event, 'event')
          .relation(Event, 'files')
          .of(input.id)
          .add(input.fileIds);
      }

      if (input.fileIdsToRemove?.length) {
        await queryRunner.manager
          .createQueryBuilder(Event, 'event')
          .relation(Event, 'files')
          .of(input.id)
          .remove(input.fileIdsToRemove);
      }

      if (input.campIdsToRemove?.length) {
        const updateCamps = await queryRunner.manager.update(
          Camp,
          {
            id: In(input.campIdsToRemove),
          },
          {
            eventId: null,
          },
        );

        if (updateCamps.affected !== input.campIdsToRemove.length) {
          throw new Error('Failed to remove all camp references');
        }
      }

      if (
        input.name ||
        input.description ||
        input.startDate ||
        input.endDate ||
        input.thumbnailId ||
        input.earlyBirdId
      ) {
        const update = await queryRunner.manager.update(Event, input.id, {
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          thumbnailId: input.thumbnailId,
          earlyBirdId: input.earlyBirdId,
        });

        if (update.affected === 0) {
          throw new Error('No event was updated');
        }
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Event updated successfully',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Error while updating event',
      };
    } finally {
      await queryRunner.release();
    }
  }

  async remove(input: RemoveEventInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const removeEvent = await this.eventRepository.softDelete(input.id);

      if (removeEvent.affected === 0) {
        throw new Error('No event was deleted');
      }

      await this.removeCamps(queryRunner, input);

      return {
        success: true,
        message: 'Events removed successfully and camps unlinked',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: 'Error while removing event',
      };
    } finally {
      await queryRunner.release();
    }
  }

  async removeCamps(queryRunner: QueryRunner, input: RemoveEventInput) {
    const camps = await queryRunner.manager.find(Camp, {
      where: { eventId: input.id },
      relations: ['campVariants', 'campRegistrations'],
    });

    if (!camps?.length) return;

    for (const camp of camps) {
      if (camp.campRegistrations?.length) {
        for (const variant of camp.campVariants) {
          const now = moment.tz('Africa/Cairo');
          if (now.diff(variant.endDate) < 0) {
            throw Error(
              `Cannot delete camp, some weeks are still running ${variant.name}`,
            );
          }
        }
      }

      const deleteCamp = await queryRunner.manager.softDelete(Camp, {
        id: camp.id,
      });

      if (deleteCamp.affected !== 1) {
        throw Error('Failed to delete camp');
      }

      if (camp.campVariants?.length) {
        const deleteCampVariants = await queryRunner.manager.softDelete(
          CampVariant,
          { campId: camp.id },
        );

        if (deleteCampVariants.affected !== camp.campVariants.length) {
          throw Error('Failed to delete all camp Variants');
        }
      }
    }
  }

  async paginate(input: PaginateEventsInput) {
    const queryBuilder = this.eventRepository.createQueryBuilder('event');

    if (input.search) {
      queryBuilder.andWhere('event.name ILIKE :search', {
        search: `%${input.search}%`,
      });
    }

    if (input.isPrivate === false) {
      queryBuilder
        .innerJoinAndSelect('event.camps', 'camps')
        .andWhere('camps.isPrivate = :isPrivate', {
          isPrivate: input.isPrivate,
        });
    }

    const paginator = buildPaginator({
      entity: Event,
      alias: 'event',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
