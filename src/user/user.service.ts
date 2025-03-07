import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserType } from 'support/enums';
import { ResponseWrapper } from 'support/response-wrapper.entity';
import { AuthService } from 'src/auth/auth.service';
import { Child } from 'src/child/entities/child.entity';
import { UserAuthResponse } from 'src/auth/entities/user-auth-response.entity';
import { DecodedIdToken } from 'firebase-admin/auth';
import { CreateUserResponse } from './entities/create-user-response.wrapper';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  async create(input: CreateUserInput): Promise<CreateUserResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const firebaseData = await this.authService.verifyFirebaseToken(
        input.firebaseToken,
      );

      if (!firebaseData) {
        throw new Error('Invalid or expired token');
      }

      if (input.email !== firebaseData.email) {
        throw new Error('Email does not match token');
      }

      if (input.type == UserType.parent) {
        return await this.createParent(input, firebaseData, queryRunner);
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

  async createParent(
    input: CreateUserInput,
    firebaseData: DecodedIdToken,
    queryRunner: QueryRunner,
  ) {
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

    const children = input.children.map((child) => {
      return { ...child, parentId: firebaseData.uid };
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
        return { ...additional, id: firebaseData.uid };
      });

      const parentAdditionalResult = await this.repo.insert(parentAdditional);

      if (
        parentAdditionalResult.raw.affectedRows !==
        input.parentAdditional.length
      ) {
        throw new Error('Failed to create parent additional');
      }
    }

    await queryRunner.commitTransaction();

    const accessToken = this.authService.generateAccessToken(
      firebaseData.uid,
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

  update(id: number, updateUserInput: UpdateUserInput) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
