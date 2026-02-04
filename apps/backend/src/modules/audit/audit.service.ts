import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuditService {
  log(event: {
    actorId: string;
    actorRole: string;
    action: string;
    metadata?: any;
  }) {
    return {
      auditId: uuid(),
      ...event,
      createdAt: new Date().toISOString(),
      immutable: true
    };
  }
}
