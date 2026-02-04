import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { MiningService } from './mining.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('mining')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class MiningController {
  constructor(private readonly mining: MiningService) {}

  @Post('start')
  async start(@Req() req: any) {
    return await this.mining.mine(req.user.userId);
  }
}
