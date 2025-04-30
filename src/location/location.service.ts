import { Injectable } from '@nestjs/common';
import { CreateLocationInput } from './dto/create-location.input';
import { UpdateLocationInput } from './dto/update-location.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { DataSource, In, Repository } from 'typeorm';
import { PaginateLocationsInput } from './dto/paginate-locations.input';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { UpdateLocationsInput } from './dto/update-locations.input';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location) private repo: Repository<Location>,
    private dataSource: DataSource,
  ) {}

  async create(input: CreateLocationInput) {
    try {
      const response = await this.repo.insert(input);

      if (response.raw.affectedRows !== 1) {
        throw new Error('Location was not created');
      }

      return {
        success: true,
        message: 'Location created successfully',
        data: {
          locationId: response.raw.insertId,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: 'Error while creating location',
      };
    }
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async update(input: UpdateLocationInput) {
    try {
      const update = await this.repo.update(input.id, input);
      if (update.affected !== 1) {
        return {
          success: false,
          message: 'Location was not updated',
        };
      } else {
        return {
          success: true,
          message: 'Location updated successfully',
        };
      }
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e ?? 'Error while updating location',
      };
    }
  }

  async updateLocations(input: UpdateLocationsInput) {
    try {
      let failedToUpdateIds: number[] = [];

      for (let location of input.locations) {
        const response = await this.repo.update(location.id, location);

        if (response.affected !== 1) {
          failedToUpdateIds.push(location.id);
        }
      }

      if (failedToUpdateIds.length > 0) {
        throw new Error(
          `Some locations were not updated: ${failedToUpdateIds.join(',')}`,
        );
      }

      return {
        success: true,
        message: 'Locations updated successfully',
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: 'Error while updating location',
      };
    }
  }

  async remove(ids: number[]) {
    try {
      const response = await this.repo.delete(ids);

      if (response.affected === 0) {
        throw new Error('No location was deleted');
      }

      return {
        success: true,
        message: `${response.affected} Locations deleted successfully`,
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: 'Error while deleting location',
      };
    }
  }

  paginate(input: PaginateLocationsInput) {
    const queryBuilder = this.repo.createQueryBuilder('location');

    if (input.search) {
      queryBuilder.where('location.name LIKE :search', {
        search: `%${input.search}%`,
      });
    }

    const paginator = buildPaginator({
      entity: Location,
      paginationKeys: ['name', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }

  findAllByKeys(keys: readonly number[]) {
    return this.repo.find({ where: { id: In(keys) } });
  }
}
