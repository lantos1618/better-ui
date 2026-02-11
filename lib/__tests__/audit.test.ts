/**
 * Tests for audit logging
 */

import {
  ConsoleAuditLogger,
  NoopAuditLogger,
  createAuditEntry,
  type AuditEntry,
} from '../audit';

describe('Audit Logger', () => {
  describe('NoopAuditLogger', () => {
    it('collects entries in memory', () => {
      const logger = new NoopAuditLogger();

      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        event: 'tool_execute',
        tool: 'weather',
        ip: '127.0.0.1',
        success: true,
        durationMs: 42,
      };

      logger.log(entry);
      logger.log({ ...entry, tool: 'search' });

      expect(logger.entries).toHaveLength(2);
      expect(logger.entries[0].tool).toBe('weather');
      expect(logger.entries[1].tool).toBe('search');
    });
  });

  describe('createAuditEntry', () => {
    it('tracks timing', async () => {
      const { finish } = createAuditEntry('tool_execute', 'weather', '127.0.0.1');

      // Small delay to ensure durationMs > 0
      await new Promise((r) => setTimeout(r, 10));

      const finalEntry = finish(true);

      expect(finalEntry.event).toBe('tool_execute');
      expect(finalEntry.tool).toBe('weather');
      expect(finalEntry.ip).toBe('127.0.0.1');
      expect(finalEntry.success).toBe(true);
      expect(finalEntry.durationMs).toBeGreaterThanOrEqual(0);
      expect(finalEntry.timestamp).toBeDefined();
      expect(finalEntry.error).toBeUndefined();
    });

    it('records errors', () => {
      const { finish } = createAuditEntry('tool_blocked', 'sendEmail', '10.0.0.1');
      const finalEntry = finish(false, 'HITL bypass attempt');

      expect(finalEntry.success).toBe(false);
      expect(finalEntry.error).toBe('HITL bypass attempt');
      expect(finalEntry.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ConsoleAuditLogger', () => {
    it('writes JSON to stdout', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const logger = new ConsoleAuditLogger();

      const entry: AuditEntry = {
        timestamp: '2025-01-01T00:00:00.000Z',
        event: 'tool_confirm',
        tool: 'sendEmail',
        ip: '192.168.1.1',
        success: true,
        durationMs: 100,
      };

      logger.log(entry);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logged).toEqual(entry);

      consoleSpy.mockRestore();
    });
  });
});
