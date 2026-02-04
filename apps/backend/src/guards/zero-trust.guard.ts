import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class ZeroTrustGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    if (!req.headers['x-device-id']) return false;
    if (!req.headers['x-client-signature']) return false;
    if (!req.user) return false;

    return true;
  }
}
