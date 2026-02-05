import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('escrow')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class EscrowController {
  constructor(private readonly escrow: EscrowService) {}

  @Post('create')
  async create(@Req() req: any, @Body() body: {
    sellerUserId: string;
    amountPaise: number;
    terms: any;
  }) {
    return await this.escrow.create({
      buyerUserId: req.user.userId,
      sellerUserId: body.sellerUserId,
      amountPaise: body.amountPaise,
      terms: body.terms
    });
  }

  @Post('fund')
  async fund(@Req() req: any, @Body() body: { escrowId: string }) {
    return await this.escrow.fund(body.escrowId, req.user.userId);
  }

  @Post('transit')
  async transit(@Req() req: any, @Body() body: { escrowId: string }) {
    return await this.escrow.markInTransit(body.escrowId, req.user.userId);
  }

  @Post('release')
  async release(@Req() req: any, @Body() body: { escrowId: string }) {
    return await this.escrow.release(body.escrowId, req.user.userId);
  }
}
