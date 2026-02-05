import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class BlockchainService {
  constructor(
    private readonly db: DbService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService
  ) {}

  private async getConfig() {
    const res = await this.db.query(
      `SELECT * FROM chain_config WHERE id = 1`
    );
    return res.rows[0];
  }

  async mint(params: {
    actorRole: string;
    userId: string;
    amountVnc: number;
    txHash: string;
  }) {
    if (params.actorRole !== 'OWNER') {
      throw new ForbiddenException('Only owner can mint');
    }

    const cfg = await this.getConfig();
    if (!cfg.bridge_enabled) {
      throw new ForbiddenException('Bridge disabled');
    }

    const wallet = await this.wallet.getOrCreateWallet(params.userId);

    await this.db.query(
      `INSERT INTO bridge_events
       (id, user_id, wallet_id, action, amount_vnc, tx_hash)
       VALUES ($1, $2, $3, 'MINT', $4, $5)`,
      [uuid(), params.userId, wallet.id, params.amountVnc, params.txHash]
    );

    this.audit.log({
      actorId: params.userId,
      actorRole: 'OWNER',
      action: 'VNC_MINT',
      metadata: { amountVnc: params.amountVnc, txHash: params.txHash }
    });

    return { status: 'MINT_RECORDED' };
  }

  async burn(params: {
    actorRole: string;
    userId: string;
    amountVnc: number;
    txHash: string;
  }) {
    if (params.actorRole !== 'OWNER') {
      throw new ForbiddenException('Only owner can burn');
    }

    const cfg = await this.getConfig();
    if (!cfg.bridge_enabled) {
      throw new ForbiddenException('Bridge disabled');
    }

    const wallet = await this.wallet.getOrCreateWallet(params.userId);

    await this.db.query(
      `INSERT INTO bridge_events
       (id, user_id, wallet_id, action, amount_vnc, tx_hash)
       VALUES ($1, $2, $3, 'BURN', $4, $5)`,
      [uuid(), params.userId, wallet.id, params.amountVnc, params.txHash]
    );

    this.audit.log({
      actorId: params.userId,
      actorRole: 'OWNER',
      action: 'VNC_BURN',
      metadata: { amountVnc: params.amountVnc, txHash: params.txHash }
    });

    return { status: 'BURN_RECORDED' };
  }
}
