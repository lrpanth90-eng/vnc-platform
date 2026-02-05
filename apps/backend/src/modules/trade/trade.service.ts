import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class TradeService {
  constructor(
    private readonly db: DbService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService
  ) {}

  async placeOrder(params: {
    userId: string;
    side: 'BUY' | 'SELL';
    pricePaise: number;
    quantity: number;
  }) {
    const wallet = await this.wallet.getOrCreateWallet(params.userId);

    if (params.side === 'BUY') {
      const required = params.pricePaise * params.quantity;
      const balance = await this.wallet.getBalance(wallet.id);

      if (balance < required) {
        throw new ForbiddenException('Insufficient INR balance');
      }

      // lock funds logically via ledger debit
      await this.wallet.debit({
        walletId: wallet.id,
        amountPaise: required,
        referenceType: 'TRADE_BUY_LOCK'
      });
    }

    const orderId = uuid();

    await this.db.query(
      `INSERT INTO trade_orders
       (id, user_id, wallet_id, side, price_paise, quantity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        orderId,
        params.userId,
        wallet.id,
        params.side,
        params.pricePaise,
        params.quantity
      ]
    );

    this.audit.log({
      actorId: params.userId,
      actorRole: 'USER',
      action: 'TRADE_ORDER_PLACED',
      metadata: params
    });

    return { orderId };
  }

  async match(orderId: string) {
    // explicit matching (no auto cron here)
    const orderRes = await this.db.query(
      `SELECT * FROM trade_orders WHERE id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new ForbiddenException('Order not found');
    }

    const order = orderRes.rows[0];

    const opposite = await this.db.query(
      `SELECT * FROM trade_orders
       WHERE side != $1
       AND price_paise = $2
       AND status = 'OPEN'
       ORDER BY created_at ASC
       LIMIT 1`,
      [order.side, order.price_paise]
    );

    if (opposite.rows.length === 0) {
      return { status: 'NO_MATCH' };
    }

    const execId = uuid();

    await this.db.query(
      `INSERT INTO trade_executions
       (id, buy_order_id, sell_order_id, price_paise, quantity)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        execId,
        order.side === 'BUY' ? order.id : opposite.rows[0].id,
        order.side === 'SELL' ? order.id : opposite.rows[0].id,
        order.price_paise,
        Math.min(order.quantity, opposite.rows[0].quantity)
      ]
    );

    this.audit.log({
      actorId: order.user_id,
      actorRole: 'USER',
      action: 'TRADE_EXECUTED',
      metadata: { execId }
    });

    return { status: 'MATCHED', execId };
  }
}
