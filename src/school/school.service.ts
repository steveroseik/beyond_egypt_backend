import { Injectable } from '@nestjs/common';
import { CreateSchoolInput } from './dto/create-school.input';
import { UpdateSchoolInput } from './dto/update-school.input';
import { InjectRepository } from '@nestjs/typeorm';
import { School } from './entities/school.entity';
import { DataSource, In, Repository } from 'typeorm';
import { PaginateSchoolsInput } from './dto/paginate-schools.input';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { AwsBucketService } from 'src/aws-bucket/aws-bucket.service';

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School) private repo: Repository<School>,
    private dataSource: DataSource,
    private awsService: AwsBucketService,
  ) {}

  async create(input: CreateSchoolInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let imageKey: string = undefined;
      if (input.base64Image) {
        const imageUpload = await this.awsService.uploadSingleFileFromBase64({
          fileName: input.base64Image.name,
          base64File: input.base64Image.base64,
          isPublic: true,
        });

        if (!imageUpload.success || !imageUpload.key) {
          throw new Error('Error while uploading image');
        }

        imageKey = imageUpload.key;
      }

      const createSchool = await queryRunner.manager.insert(School, {
        ...input,
        imageKey,
      });

      if (!createSchool.raw.insertId) {
        throw new Error('Error while creating school');
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'School created successfully',
        data: {
          id: createSchool.raw.insertId,
        },
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Error while creating school',
      };
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all school`;
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async update(input: UpdateSchoolInput) {
    if (!input.nameAr && !input.nameEn && !input.base64Image) {
      return {
        success: false,
        message: 'No data provided to update',
      };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const school = await queryRunner.manager.findOne(School, {
        where: { id: input.id },
      });
      if (!school) {
        throw new Error('School not found');
      }

      let imageKey: string = undefined;
      if (input.base64Image) {
        if (school.imageKey) {
          const deleteOldImage = await this.awsService.deleteFile(
            school.imageKey,
          );

          if (!deleteOldImage.success) {
            throw new Error('Error while deleting old image');
          }
        }

        const imageUpload = await this.awsService.uploadSingleFileFromBase64({
          fileName: input.base64Image.name,
          base64File: input.base64Image.base64,
          isPublic: true,
        });

        if (!imageUpload.success || !imageUpload.key) {
          throw new Error('Error while uploading image');
        }

        imageKey = imageUpload.key;
      }

      const updateSchool = await queryRunner.manager.update(School, input.id, {
        ...input,
        imageKey,
      });

      if (updateSchool.affected === 0) {
        throw new Error('No school was updated');
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'School updated successfully',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Error while updating school',
      };
    } finally {
      await queryRunner.release();
    }
  }

  async remove(ids: number[]) {
    try {
      const schools = await this.repo.find({ where: { id: In(ids) } });

      for (const school of schools) {
        if (school.imageKey) {
          const deleteImage = await this.awsService.deleteFile(school.imageKey);
          if (!deleteImage.success) {
            throw new Error('Error while deleting image');
          }
        }
      }

      const response = await this.repo.delete(ids);

      if (response.affected === 0) {
        throw new Error('No school was deleted');
      }
      return {
        success: true,
        message: `${response.affected} Schools removed successfully`,
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: 'Error while removing school',
      };
    }
  }

  paginateSchools(input: PaginateSchoolsInput) {
    const queryBuilder = this.repo.createQueryBuilder('school');

    if (input.name) {
      queryBuilder.where(
        'school.nameEn like :name OR school.nameAr like :name',
        { name: `%${input.name}%` },
      );
    }

    const paginator = buildPaginator({
      entity: School,
      alias: 'school',
      query: {
        ...input,
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
