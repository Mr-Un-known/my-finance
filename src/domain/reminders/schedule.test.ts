import { describe, expect, it } from 'vitest';
import { calculateReminderTime } from './schedule';

describe('calculateReminderTime', () => {
  it('resta los dias configurados y fija la hora a las 9am Colombia (14:00 UTC)', () => {
    expect(calculateReminderTime('2026-09-20', 1)).toBe('2026-09-19T14:00:00.000Z');
  });

  it('con 0 dias antes, recuerda el mismo dia', () => {
    expect(calculateReminderTime('2026-09-20', 0)).toBe('2026-09-20T14:00:00.000Z');
  });

  it('cruza el mes y el año correctamente', () => {
    expect(calculateReminderTime('2026-01-01', 2)).toBe('2025-12-30T14:00:00.000Z');
  });
});
