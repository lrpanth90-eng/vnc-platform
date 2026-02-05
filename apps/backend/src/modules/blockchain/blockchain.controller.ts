import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('blockchain')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class BlockchainController {
  constructor(private readonly chain: BlockchainService) {}

  @Post('mint')
  async mint(@Req() req: any, @Body() body: {
    userId: string;
    amountVnc: number;
    txHash: string;
  }) {
    return await this.chain.mint({
      actorRole: req.user.role,
      userId: body.userId,
      amountVnc: body.amountVnc,
      txHash: body.txHash
    });
  }

  @Post('burn')
  async burn(@Req() req: any, @Body() body: {
    userId: string;
    amountVnc: number;
    txHash: string;
  }) {
    return await this.chain.burn({
      actorRole: req.user.role,
      userId: body.userId,
      amountVnc: body.amountVnc,
      txHash: body.txHash
    });
  }
}
