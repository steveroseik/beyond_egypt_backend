// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { GqlExecutionContext } from '@nestjs/graphql';
// import { AuthGuard } from '@nestjs/passport';
// import { Observable } from 'rxjs';
// import { JwtPayload } from '../types/jwtPayload.type';
// import { Roles } from '../decorators/RolesDecorator';

// @Injectable()
// export class RolesGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   getRequest(context: ExecutionContext) {
//     const ctx = GqlExecutionContext.create(context);

//     return ctx.getContext().req;
//   }

//   validateRoles(userRoles: number[], allowedRoles: number[]) {
//     let allowed: boolean = false;

//     for (let i = 0; i < allowedRoles.length; i++) {
//       if (userRoles.includes(allowedRoles[i])) {
//         allowed = true;
//         break;
//       }
//     }

//     return allowed;
//   }

//   canActivate(
//     context: ExecutionContext,
//   ): boolean | Promise<boolean> | Observable<boolean> {
//     const allowedRoles = this.reflector.get<number[]>(
//       'roles',
//       context.getHandler(),
//     );
//     const req = this.getRequest(context);
//     const user: JwtPayload = req.user;
//     const roles = user.roles;

//     // admin can access all roles;
//     return this.validateRoles(roles, [Roles.admin, ...allowedRoles]);
//   }
// }
