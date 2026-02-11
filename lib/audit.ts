/**
 * Audit logging for tool executions
 *
 * Provides structured JSON logging for every tool execution,
 * confirmation, and blocked attempt.
 */

export type AuditEvent = 'tool_execute' | 'tool_confirm' | 'tool_blocked';

export interface AuditEntry {
  timestamp: string;
  event: AuditEvent;
  tool: string;
  ip: string;
  success: boolean;
  durationMs?: number;
  error?: string;
}

export interface AuditLogger {
  log(entry: AuditEntry): void;
}

/**
 * Production logger — writes structured JSON to stdout
 */
export class ConsoleAuditLogger implements AuditLogger {
  log(entry: AuditEntry): void {
    console.log(JSON.stringify(entry));
  }
}

/**
 * Test logger — collects entries in memory for assertions
 */
export class NoopAuditLogger implements AuditLogger {
  entries: AuditEntry[] = [];

  log(entry: AuditEntry): void {
    this.entries.push(entry);
  }
}

/**
 * Create an audit entry with timing support.
 *
 * Usage:
 *   const { entry, finish } = createAuditEntry('tool_execute', 'weather', '127.0.0.1');
 *   // ... do work ...
 *   const finalEntry = finish(true);
 *   auditLogger.log(finalEntry);
 */
export function createAuditEntry(
  event: AuditEvent,
  tool: string,
  ip: string
): { entry: Omit<AuditEntry, 'success' | 'durationMs' | 'error'>; finish: (success: boolean, error?: string) => AuditEntry } {
  const start = Date.now();
  const entry = {
    timestamp: new Date(start).toISOString(),
    event,
    tool,
    ip,
  };

  return {
    entry,
    finish(success: boolean, error?: string): AuditEntry {
      return {
        ...entry,
        success,
        durationMs: Date.now() - start,
        ...(error ? { error } : {}),
      };
    },
  };
}

/** Singleton audit logger — swap for NoopAuditLogger in tests */
export const auditLogger: AuditLogger = new ConsoleAuditLogger();
