import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService
  ) {}

  async generateReport(params: {
    reportType: 'AML_USER' | 'GST_MERCHANT' | 'RBI_LEDGER' | 'LAW_ENFORCEMENT';
    subjectId?: string;
    requesterId: string;
    requesterRole: string;
  }) {
    if (!['ADMIN', 'OWNER'].includes(params.requesterRole)) {
      throw new ForbiddenException('Not authorized');
    }

    const requestId = uuid();

    await this.db.query(
      `INSERT INTO compliance_requests
       (id, report_type, subject_id, requested_by, requester_role)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        requestId,
        params.reportType,
        params.subjectId || null,
        params.requesterId,
        params.requesterRole
      ]
    );

    // 🔎 DATA DERIVATION (READ-ONLY)
    const data = await this.deriveData(params.reportType, params.subjectId);

    await this.db.query(
      `INSERT INTO compliance_snapshots
       (id, request_id, data)
       VALUES ($1, $2, $3)`,
      [uuid(), requestId, data]
    );

    this.audit.log({
      actorId: params.requesterId,
      actorRole: params.requesterRole,
      action: 'COMPLIANCE_REPORT_GENERATED',
      metadata: { requestId, reportType: params.reportType }
    });

    return { requestId };
  }

  private async deriveData(type: string, subjectId?: string) {
    switch (type) {
      case 'AML_USER':
        return await this.db.query(
          `SELECT * FROM users WHERE id = $1`,
          [subjectId]
        ).then(r => r.rows);

      case 'GST_MERCHANT':
        return await this.db.query(
          `SELECT * FROM merchant_payments WHERE merchant_id = $1`,
          [subjectId]
        ).then(r => r.rows);

      case 'RBI_LEDGER':
        return await this.db.query(
          `SELECT * FROM ledger_entries ORDER BY created_at ASC`
        ).then(r => r.rows);

      case 'LAW_ENFORCEMENT':
        return await this.db.query(
          `SELECT * FROM audit_logs ORDER BY created_at ASC`
        ).then(r => r.rows);

      default:
        return {};
    }
  }
}
