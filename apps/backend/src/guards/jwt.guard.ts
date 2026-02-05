import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../modules/auth/auth.service';
import { FraudService } from '../modules/fraud/fraud.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
    private readonly fraud: FraudService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];

    if (!authHeader) throw new UnauthorizedException();

    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwt.verify(token);

    await this.auth.validateToken(payload);

    if (await this.fraud.isFrozen(payload.userId)) {
      throw new UnauthorizedException('Account frozen');
    }

    req.user = payload;
    return true;
  }
}
