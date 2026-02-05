import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FraudService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService
  ) {}

  async flagUser(params: {
    userId: string;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    autoFreeze?: boolean;
  }) {
    await this.db.query(
      `INSERT INTO fraud_flags
       (id, subject_type, subject_id, reason, severity, auto_frozen)
       VALUES ($1, 'USER', $2, $3, $4, $5)`,
      [
        uuid(),
        params.userId,
        params.reason,
        params.severity,
        params.autoFreeze || false
      ]
    );

    if (params.autoFreeze) {
      await this.freezeUser(params.userId, params.reason);
    }

    this.audit.log({
      actorId: params.userId,
      actorRole: 'SYSTEM',
      action: 'FRAUD_FLAGGED',
      metadata: params
    });
  }

  async addGraphEdge(params: {
    fromType: string;
    fromId: string;
    toType: string;
    toId: string;
    relation: string;
    weight?: number;
  }) {
    await this.db.query(
      `INSERT INTO fraud_graph_edges
       (id, from_type, from_id, to_type, to_id, relation, weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuid(),
        params.fromType,
        params.fromId,
        params.toType,
        params.toId,
        params.relation,
        params.weight || 1
      ]
    );
  }

  async freezeUser(userId: string, reason: string) {
    await this.db.query(
      `INSERT INTO freeze_states
       (id, user_id, frozen, reason)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET frozen = true, reason = $3`,
      [uuid(), userId, reason]
    );

    this.audit.log({
      actorId: userId,
      actorRole: 'SYSTEM',
      action: 'ACCOUNT_FROZEN',
      metadata: { reason }
    });
  }

  async isFrozen(userId: string): Promise<boolean> {
    const res = await this.db.query(
      `SELECT frozen FROM freeze_states WHERE user_id = $1`,
      [userId]
    );

    return res.rows[0]?.frozen === true;
  }
}
