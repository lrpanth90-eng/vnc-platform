import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class EscrowService {
  constructor(
    private readonly db: DbService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService
  ) {}

  async create(params: {
    buyerUserId: string;
    sellerUserId: string;
    amountPaise: number;
    terms: any;
  }) {
    const escrowId = uuid();

    await this.db.query(
      `INSERT INTO escrows
       (id, buyer_user_id, seller_user_id, amount_paise, currency, terms)
       VALUES ($1, $2, $3, $4, 'INR', $5)`,
      [
        escrowId,
        params.buyerUserId,
        params.sellerUserId,
        params.amountPaise,
        params.terms
      ]
    );

    await this.db.query(
      `INSERT INTO escrow_events
       (id, escrow_id, to_status, actor_user_id)
       VALUES ($1, $2, 'CREATED', $3)`,
      [uuid(), escrowId, params.buyerUserId]
    );

    this.audit.log({
      actorId: params.buyerUserId,
      actorRole: 'USER',
      action: 'ESCROW_CREATED',
      metadata: { escrowId }
    });

    return { escrowId };
  }

  async fund(escrowId: string, buyerUserId: string) {
    const escrow = await this.getEscrow(escrowId);

    if (escrow.status !== 'CREATED') {
      throw new ForbiddenException('Escrow not fundable');
    }

    const buyerWallet = await this.wallet.getOrCreateWallet(buyerUserId);

    await this.wallet.debit({
      walletId: buyerWallet.id,
      amountPaise: escrow.amount_paise,
      referenceType: 'ESCROW_LOCK',
      referenceId: escrowId
    });

    await this.recordEvent(
      escrowId,
      'CREATED',
      'FUNDED',
      buyerUserId
    );

    return { status: 'FUNDED' };
  }

  async markInTransit(escrowId: string, sellerUserId: string) {
    const escrow = await this.getEscrow(escrowId);

    if (escrow.seller_user_id !== sellerUserId) {
      throw new ForbiddenException('Only seller can mark transit');
    }

    if (escrow.status !== 'FUNDED') {
      throw new ForbiddenException('Invalid escrow state');
    }

    await this.recordEvent(
      escrowId,
      'FUNDED',
      'IN_TRANSIT',
      sellerUserId
    );

    return { status: 'IN_TRANSIT' };
  }

  async release(escrowId: string, buyerUserId: string) {
    const escrow = await this.getEscrow(escrowId);

    if (escrow.buyer_user_id !== buyerUserId) {
      throw new ForbiddenException('Only buyer can release');
    }

    if (escrow.status !== 'IN_TRANSIT') {
      throw new ForbiddenException('Cannot release yet');
    }

    const sellerWallet = await this.wallet.getOrCreateWallet(
      escrow.seller_user_id
    );

    await this.wallet.credit({
      walletId: sellerWallet.id,
      amountPaise: escrow.amount_paise,
      referenceType: 'ESCROW_RELEASE',
      referenceId: escrowId
    });

    await this.recordEvent(
      escrowId,
      'IN_TRANSIT',
      'RELEASED',
      buyerUserId
    );

    return { status: 'RELEASED' };
  }

  private async getEscrow(escrowId: string) {
    const res = await this.db.query(
      `SELECT * FROM escrows WHERE id = $1`,
      [escrowId]
    );

    if (res.rows.length === 0) {
      throw new ForbiddenException('Escrow not found');
    }

    return res.rows[0];
  }

  private async recordEvent(
    escrowId: string,
    fromStatus: string,
    toStatus: string,
    actorUserId: string
  ) {
    await this.db.query(
      `INSERT INTO escrow_events
       (id, escrow_id, from_status, to_status, actor_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuid(), escrowId, fromStatus, toStatus, actorUserId]
    );

    this.audit.log({
      actorId: actorUserId,
      actorRole: 'USER',
      action: 'ESCROW_STATUS_CHANGE',
      metadata: { escrowId, fromStatus, toStatus }
    });
  }
}
