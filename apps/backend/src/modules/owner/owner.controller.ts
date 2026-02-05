import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { OwnerService } from './owner.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('owner')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class OwnerController {
  constructor(private readonly owner: OwnerService) {}

  @Get('flags')
  async flags(@Req() req: any) {
    if (req.user.role !== 'OWNER') {
      throw new Error('Owner only');
    }
    return await this.owner.getFlags();
  }

  @Post('flags')
  async update(@Req() req: any, @Body() body: any) {
    return await this.owner.updateFlags(req.user.role, body);
  }
}
