import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';
import { Public, IS_PUBLIC_KEY } from './public.decorator';
import { Roles, ROLES_KEY } from './roles.decorator';

function getParamDecoratorFactory(decorator: Function) {
  class TestClass {
    test(@decorator() value: any) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'test');
  return args[Object.keys(args)[0]].factory;
}

describe('Decorators', () => {
  describe('@CurrentUser', () => {
    it('should return request.user from ExecutionContext', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const mockUser = { userId: '123', email: 'test@user.com', role: 'ADMIN' };
      const mockCtx = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: mockUser,
          }),
        }),
      } as unknown as ExecutionContext;

      const result = factory(null, mockCtx);
      expect(result).toEqual(mockUser);
    });
  });

  describe('@Public', () => {
    it('should set isPublic metadata to true', () => {
      class TestController {
        @Public()
        testMethod() {}
      }

      const instance = new TestController();
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, instance.testMethod);
      expect(metadata).toBe(true);
    });
  });

  describe('@Roles', () => {
    it('should set roles metadata with provided roles', () => {
      class TestController {
        @Roles('ADMIN', 'USER')
        testMethod() {}
      }

      const instance = new TestController();
      const metadata = Reflect.getMetadata(ROLES_KEY, instance.testMethod);
      expect(metadata).toEqual(['ADMIN', 'USER']);
    });
  });
});
