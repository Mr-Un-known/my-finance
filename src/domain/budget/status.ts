/**
 * Presupuesto: solo informa, nunca bloquea (requisito explicito).
 * 'warning' arranca en 80% para que el usuario alcance a reaccionar
 * antes de pasarse.
 */
export type BudgetState = 'ok' | 'warning' | 'exceeded';

export interface BudgetStatus {
  spent: number;
  budget: number;
  remaining: number;
  /** 0 a 1+ (puede pasar de 1 si se excede). */
  percentage: number;
  state: BudgetState;
}

const WARNING_THRESHOLD = 0.8;

export function calculateBudgetStatus(spent: number, budget: number): BudgetStatus {
  const remaining = budget - spent;
  const percentage = budget > 0 ? spent / budget : spent > 0 ? Infinity : 0;
  const state: BudgetState = spent > budget ? 'exceeded' : percentage >= WARNING_THRESHOLD ? 'warning' : 'ok';
  return { spent, budget, remaining, percentage, state };
}
