import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { TradeService } from './trade.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('trade')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class TradeController {
  constructor(private readonly trade: TradeService) {}

  @Post('order')
  async order(@Req() req: any, @Body() body: {
    side: 'BUY' | 'SELL';
    pricePaise: number;
    quantity: number;
  }) {
    return await this.trade.placeOrder({
      userId: req.user.userId,
      side: body.side,
      pricePaise: body.pricePaise,
      quantity: body.quantity
    });
  }

  @Post('match')
  async match(@Body() body: { orderId: string }) {
    return await this.trade.match(body.orderId);
  }
}
