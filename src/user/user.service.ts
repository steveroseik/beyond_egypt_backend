import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, QueryRunner, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserType } from 'support/enums';
import { ResponseWrapper } from 'support/response-wrapper.entity';
import { AuthService } from 'src/auth/auth.service';
import { Child } from 'src/child/entities/child.entity';
import { UserAuthResponse } from 'src/auth/entities/user-auth-response.entity';
import { DecodedIdToken } from 'firebase-admin/auth';
import { CreateUserResponse } from './entities/create-user-response.wrapper';
import { ParentAdditional } from 'src/parent-additional/entities/parent-additional.entity';
import { CreateParentAdditionalInput } from 'src/parent-additional/dto/create-parent-additional.input';
import { PaginateUsersInput } from './dto/paginate-users.input';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { CreateEmployeeInput } from './dto/create-employee.input';
import { genId } from 'support/random-uuid.generator';
import { RegisterUserInput } from './dto/register-user.input';
import { FindInactiveUserInput } from './dto/find-inactive-user.input';
import { ChildService } from 'src/child/child.service';
import { ParentAdditionalService } from 'src/parent-additional/parent-additional.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
    private readonly childService: ChildService,
  ) {}

  async create(
    input: CreateUserInput,
    userType: UserType,
  ): Promise<CreateUserResponse | ResponseWrapper<Record<string, any>>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (userType == UserType.parent) {
        return await this.parentRegister(input, queryRunner);
      } else {
        return await this.createInitialParent(input, queryRunner);
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

  async createInitialParent(input: CreateUserInput, queryRunner: QueryRunner) {
    input.id = genId();

    await this.createParent(input, queryRunner);

    await queryRunner.commitTransaction();

    return {
      success: true,
      message: 'Parent and children created successfully',
      data: {
        id: input.id,
      },
    };
  }

  async parentRegister(input: CreateUserInput, queryRunner: QueryRunner) {
    if (!input.firebaseToken) {
      throw new Error('Firebase token is required');
    }
    const firebaseData = await this.authService.verifyFirebaseToken(
      input.firebaseToken,
    );

    if (!firebaseData) {
      throw new Error('Invalid or expired token');
    }

    if (input.email !== firebaseData.email) {
      throw new Error('Email does not match token');
    }

    input.id = firebaseData.uid;

    await this.createParent(input, queryRunner);

    await queryRunner.commitTransaction();

    const accessToken = this.authService.generateAccessToken(
      input.id,
      UserType.parent,
    );

    const user = await this.findOne(firebaseData.uid);

    return {
      success: true,
      message: 'Parent and children created successfully',
      data: {
        user: user,
        accessToken,
        message: 'Parent and children created successfully',
        userState: 2,
      },
    };
  }

  async createParent(
    input: CreateUserInput,
    queryRunner: QueryRunner,
    withToken: boolean = false,
  ) {
    if (!input.children?.length) {
      throw new Error('Parent must have at least one child');
    }

    if (!input.phone) {
      throw new Error('Parent must have a phone number');
    }

    const parent = await queryRunner.manager.insert(User, {
      id: input.id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      type: input.type,
      district: input.district,
    });

    if (parent.raw.affectedRows !== 1) {
      throw new Error('Failed to create parent');
    }

    const children = input.children.map((child) => {
      return { ...child, parentId: input.id };
    });

    const childrenResult = await queryRunner.manager.insert(
      Child,
      children.map((child) => {
        return {
          parentId: child.parentId,
          name: child.name,
          imageId: child.imageId,
          birthdate: child.birthdate,
          schoolId: child.schoolId,
          schoolName: child.schoolName,
          medicalInfo: child.medicalInfo,
          parentRelation: child.parentRelation,
          isMale: child.isMale,
          extraNotes: child.extraNotes,
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
      const parentAdditional: CreateParentAdditionalInput[] =
        input.parentAdditional.map((additional) => {
          return { ...additional, userId: input.id };
        });

      const parentAdditionalResult = await queryRunner.manager.insert(
        ParentAdditional,
        parentAdditional,
      );

      if (
        parentAdditionalResult.raw.affectedRows !==
        input.parentAdditional.length
      ) {
        throw new Error('Failed to create parent additional');
      }
    }

    return true;
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findOneByEmail(email: string) {
    return this.repo.findOne({ where: { email: email } });
  }

  findExactOne(email: string, id: string): Promise<User> {
    return this.repo.findOne({ where: { email: email, id: id } });
  }

  async update(input: UpdateUserInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.repo.findOne({ where: { id: input.id } });
      if (!user) {
        throw new Error('User not found');
      }

      if (input.phone || input.district || input.name) {
        const updated = await this.repo.update(input.id, {
          phone: input.phone,
          district: input.district,
          name: input.name,
        });

        if (updated.affected !== 1) {
          throw new Error('Failed to update user');
        }
      }

      if (user.type === UserType.parent) {
        if (input.childrenToDelete?.length) {
          const children = await queryRunner.manager.find(Child, {
            where: { id: In(input.childrenToDelete) },
          });
          if (children.length !== input.childrenToDelete.length) {
            throw new Error('Some children not found');
          }

          const deleted = await queryRunner.manager.delete(
            Child,
            input.childrenToDelete,
          );

          if (deleted.affected !== input.childrenToDelete.length) {
            throw new Error('Failed to delete children');
          }
        }

        if (input.parentAdditionalToDelete?.length) {
          const parentAdditional = await queryRunner.manager.find(
            ParentAdditional,
            {
              where: { id: In(input.parentAdditionalToDelete) },
            },
          );
          if (
            parentAdditional.length !== input.parentAdditionalToDelete.length
          ) {
            throw new Error('Some parent additional not found');
          }

          const deleted = await queryRunner.manager.delete(
            ParentAdditional,
            input.parentAdditionalToDelete,
          );

          if (deleted.affected !== input.parentAdditionalToDelete.length) {
            throw new Error('Failed to delete parent additional');
          }
        }

        if (input.childrenToAdd?.length) {
          const children = input.childrenToAdd.map((child) => {
            return {
              parentId: input.id,
              name: child.name,
              birthdate: child.birthdate,
              schoolId: child.schoolId,
              medicalInfo: child.medicalInfo,
              parentRelation: child.parentRelation,
              isMale: child.isMale,
              extraNotes: child.extraNotes,
              otherAllergies: child.otherAllergies,
            };
          });

          const childrenResult = await queryRunner.manager.insert(
            Child,
            children,
          );

          if (childrenResult.raw.affectedRows !== input.childrenToAdd.length) {
            throw new Error('Failed to create children');
          }

          for (const [i, id] of childrenResult.identifiers.entries()) {
            const child = input.childrenToAdd[i];

            if (child.allergies?.length) {
              await queryRunner.manager
                .createQueryBuilder(Child, 'child')
                .relation(Child, 'allergies')
                .of(id)
                .add(child.allergies);
            }
          }
        }

        if (input.parentAdditionalToAdd?.length) {
          const parentAdditional = input.parentAdditionalToAdd.map(
            (additional) => {
              return { ...additional, userId: input.id };
            },
          );

          const parentAdditionalResult = await queryRunner.manager.insert(
            ParentAdditional,
            parentAdditional,
          );

          if (
            parentAdditionalResult.raw.affectedRows !==
            input.parentAdditionalToAdd.length
          ) {
            throw new Error('Failed to create parent additional');
          }
        }
      }

      if (input.childrenToUpdate?.length) {
        const children = await queryRunner.manager.find(Child, {
          where: { id: In(input.childrenToUpdate.map((child) => child.id)) },
        });

        for (const childToUpdate of input.childrenToUpdate) {
          const child = children.find((c) => c.id === childToUpdate.id);
          if (child) {
            await this.childService.updateChild(
              child,
              childToUpdate,
              queryRunner,
              input.id,
              UserType.parent,
            );
          }
        }
      }

      if (input.parentAdditionalToUpdate?.length) {
        for (const additional of input.parentAdditionalToUpdate) {
          const hasValidField = Object.keys(additional).some(
            (key) =>
              key !== 'id' &&
              additional[key as keyof CreateParentAdditionalInput] !==
                undefined,
          );

          if (hasValidField) {
            const updateParentAdditional = await queryRunner.manager.update(
              ParentAdditional,
              {
                id: additional.id,
                ...(input.id && { userId: input.id }),
              },
              additional,
            );

            if (updateParentAdditional.affected === 0) {
              throw new Error('Parent Additional not found');
            }
          }
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'User updated successfully',
      };
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

  paginate(input: PaginateUsersInput) {
    const queryBuilder = this.repo.createQueryBuilder('user');

    if (input.types?.length) {
      queryBuilder.andWhere('user.type IN (:...types)', { types: input.types });

      if (input.notTypes?.length) {
        const notTypesSet = input.notTypes.filter(
          (type) => !input.types.includes(type),
        );
        queryBuilder.andWhere('user.type NOT IN (:...notTypes)', {
          notTypes: notTypesSet,
        });
      }
    } else {
      if (input.notTypes?.length) {
        queryBuilder.andWhere('user.type NOT IN (:...notTypes)', {
          notTypes: input.notTypes,
        });
      }
    }

    if (input.search) {
      queryBuilder.andWhere(
        'user.name LIKE :name OR user.email LIKE :name OR user.phone LIKE :name',
        { name: `%${input.search}%` },
      );
    }

    const paginator = buildPaginator({
      entity: User,
      alias: 'user',
      paginationKeys: [input.orderBy ?? 'createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }

  async createEmployee(input: CreateEmployeeInput) {
    try {
      const tempId = genId();

      const createEmployee = await this.repo.insert({
        ...input,
        id: tempId,
      });

      if (createEmployee.raw.affectedRows !== 1) {
        throw new Error('Failed to create employee');
      }

      return {
        success: true,
        message: 'Employee created successfully',
        data: {
          id: tempId,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  async register(input: RegisterUserInput): Promise<CreateUserResponse> {
    try {
      const firebaseData = await this.authService.verifyFirebaseToken(
        input.firebaseToken,
      );

      if (!firebaseData) {
        throw new Error('Invalid or expired token');
      }

      if (!firebaseData.email) {
        throw new Error('Invalid token');
      }

      const user = await this.repo.findOne({ where: { id: input.id } });
      if (!user) {
        throw new Error('Invalid registration');
      }

      if (user.email !== firebaseData.email) {
        throw new Error('Email does not match token');
      }

      const updateUser = await this.repo.update(
        { id: input.id },
        {
          id: firebaseData.uid,
        },
      );

      if (updateUser.affected !== 1) {
        throw new Error('Failed to register user');
      }

      const accessToken = this.authService.generateAccessToken(
        firebaseData.uid,
        user.type,
      );

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user: user,
          accessToken,
          message: 'User registered successfully',
          userState: 2,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  findInactiveUser(input: FindInactiveUserInput) {
    return this.repo.findOne({
      where: {
        id: input.id,
        type: input.isParent ? UserType.parent : Not(UserType.parent),
      },
    });
  }

  findAllByKeys(keys: readonly string[]) {
    return this.repo.find({
      where: {
        id: In(keys),
      },
    });
  }
}
