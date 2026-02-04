import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class WalletService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService
  ) {}

  async getOrCreateWallet(userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM wallets WHERE user_id = $1 AND currency = 'INR'`,
      [userId]
    );

    if (existing.rows.length > 0) return existing.rows[0];

    const walletId = uuid();

    await this.db.query(
      `INSERT INTO wallets (id, user_id, currency)
       VALUES ($1, $2, 'INR')`,
      [walletId, userId]
    );

    return { id: walletId, user_id: userId, currency: 'INR' };
  }

  async credit(params: {
    walletId: string;
    amountPaise: number;
    referenceType: string;
    referenceId?: string;
  }) {
    if (params.amountPaise <= 0) {
      throw new ForbiddenException('Invalid credit amount');
    }

    await this.db.query(
      `INSERT INTO ledger_entries
        (id, wallet_id, amount_paise, direction, reference_type, reference_id)
       VALUES ($1, $2, $3, 'CREDIT', $4, $5)`,
      [
        uuid(),
        params.walletId,
        params.amountPaise,
        params.referenceType,
        params.referenceId || null
      ]
    );

    this.audit.log({
      actorId: params.walletId,
      actorRole: 'USER',
      action: 'WALLET_CREDIT',
      metadata: params
    });
  }

  async debit(params: {
    walletId: string;
    amountPaise: number;
    referenceType: string;
    referenceId?: string;
  }) {
    const balance = await this.getBalance(params.walletId);

    if (balance < params.amountPaise) {
      throw new ForbiddenException('Insufficient balance');
    }

    await this.db.query(
      `INSERT INTO ledger_entries
        (id, wallet_id, amount_paise, direction, reference_type, reference_id)
       VALUES ($1, $2, $3, 'DEBIT', $4, $5)`,
      [
        uuid(),
        params.walletId,
        params.amountPaise,
        params.referenceType,
        params.referenceId || null
      ]
    );

    this.audit.log({
      actorId: params.walletId,
      actorRole: 'USER',
      action: 'WALLET_DEBIT',
      metadata: params
    });
  }

  async getBalance(walletId: string): Promise<number> {
    const result = await this.db.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN direction = 'CREDIT' THEN amount_paise
              ELSE -amount_paise
            END
          ), 0
        ) AS balance
      FROM ledger_entries
      WHERE wallet_id = $1
      `,
      [walletId]
    );

    return Number(result.rows[0].balance);
  }
}
