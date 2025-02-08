import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserType } from 'support/enums';
import { ResponseWrapper } from 'support/response-wrapper.entity';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async create(
    input: CreateUserInput,
  ): Promise<ResponseWrapper<{ id?: number }>> {
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

        const parent = await this.repo.insert(input);

        if (parent.raw.affectedRows !== 1) {
          throw new Error('Failed to create parent');
        }

        const parentId = parent.raw.insertId;

        const children = input.children.map((child) => {
          return { ...child, parentId: parentId };
        });

        const childrenResult = await this.repo.insert(children);

        if (childrenResult.raw.affectedRows !== input.children.length) {
          throw new Error('Failed to create children');
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

        return {
          success: true,
          message: 'Parent and children created successfully',
          data: {
            id: parentId,
          },
        };
      }
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
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
