import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserType } from 'support/enums';
import { ResponseWrapper } from 'support/response-wrapper.entity';
import { AuthService } from 'src/auth/auth.service';
import { Child } from 'src/child/entities/child.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    input: CreateUserInput,
  ): Promise<ResponseWrapper<{ id?: number }>> {
    const queryRunner = await this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const firebaseData = await this.authService.verifyFirebaseToken(
        input.firebaseToken,
      );

      if (input.type == UserType.parent) {
        if (!input.children?.length) {
          throw new Error('Parent must have at least one child');
        }

        if (!input.phone) {
          throw new Error('Parent must have a phone number');
        }

        input.id = firebaseData.uid;

        const parent = await queryRunner.manager.insert(User, input);

        if (parent.raw.affectedRows !== 1) {
          throw new Error('Failed to create parent');
        }

        const parentId = parent.raw.insertId;

        const children = input.children.map((child) => {
          return { ...child, parentId: parentId };
        });

        const childrenResult = await queryRunner.manager.insert(
          Child,
          children.map((child) => {
            return {
              parentId: child.parentId,
              name: child.name,
              birthdate: child.birthdate,
              schoolId: child.schoolId,
              medicalInfo: child.medicalInfo,
              parentRelation: child.parentRelation,
              isMale: child.isMale,
              extraNotes: child.extraNotes,
              imageFileId: child.imageFileId,
              otherAllergies: child.otherAllergies,
            };
          }),
        );

        if (childrenResult.raw.affectedRows !== input.children.length) {
          throw new Error('Failed to create children');
        }

        for (const [i, id] of childrenResult.identifiers.entries()) {
          const child = input.children[i];

          if (child.allergies?.length) {
            await queryRunner.manager
              .createQueryBuilder(Child, 'child')
              .relation(Child, 'allergies')
              .of(id)
              .add(child.allergies);
          }
        }

        if (input.parentAdditional?.length) {
          const parentAdditional = input.parentAdditional.map((additional) => {
            return { ...additional, id: parentId };
          });

          const parentAdditionalResult =
            await this.repo.insert(parentAdditional);

          if (
            parentAdditionalResult.raw.affectedRows !==
            input.parentAdditional.length
          ) {
            throw new Error('Failed to create parent additional');
          }
        }

        await queryRunner.commitTransaction();

        return {
          success: true,
          message: 'Parent and children created successfully',
          data: {
            id: parentId,
          },
        };
      }
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  findOneByEmail(email: string) {
    return this.repo.findOne({ where: { email: email } });
  }

  findExactOne(email: string, id: string): Promise<User> {
    return this.repo.findOne({ where: { email: email, id: id } });
  }

  update(id: number, updateUserInput: UpdateUserInput) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
