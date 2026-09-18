import { describe, expect, it } from 'vitest';
import { calculateBudgetStatus } from './status';

describe('calculateBudgetStatus', () => {
  it('esta ok por debajo del 80%', () => {
    expect(calculateBudgetStatus(500_000, 1_000_000).state).toBe('ok');
  });

  it('avisa (warning) desde el 80%', () => {
    expect(calculateBudgetStatus(800_000, 1_000_000).state).toBe('warning');
    expect(calculateBudgetStatus(799_999, 1_000_000).state).toBe('ok');
  });

  it('marca excedido cuando el gasto pasa el presupuesto, pero no bloquea (solo informa)', () => {
    const status = calculateBudgetStatus(1_200_000, 1_000_000);
    expect(status.state).toBe('exceeded');
    expect(status.remaining).toBe(-200_000); // negativo: informativo, no un error
  });

  it('presupuesto en cero con gasto no revienta la funcion', () => {
    expect(calculateBudgetStatus(0, 0).state).toBe('ok');
    expect(calculateBudgetStatus(50_000, 0).state).toBe('exceeded');
  });
});
