import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { OwnerService } from '../modules/owner/owner.service';

@Injectable()
export class PlatformGuard implements CanActivate {
  constructor(private readonly owner: OwnerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // health must always work
    if (req.url.startsWith('/health')) return true;

    const flags = await this.owner.getFlags();
    if (flags.platform_paused) {
      throw new ForbiddenException('Platform temporarily paused');
    }

    return true;
  }
}
