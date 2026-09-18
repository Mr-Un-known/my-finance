/**
 * Calcula CUANDO debe dispararse un recordatorio para un movimiento.
 * Puro: recibe la fecha del movimiento y cuantos dias antes avisar,
 * devuelve un datetime ISO en UTC a una hora fija razonable (9:00 am
 * hora de Colombia = 14:00 UTC, sin horario de verano).
 */
import { addDays, parseISO, toISO } from '../dates';
import type { ISODate } from '../types';

const REMINDER_HOUR_UTC = 14; // 9:00 am America/Bogota (UTC-5, sin DST)

export function calculateReminderTime(transactionDate: ISODate, daysBefore: number): string {
  const remindDate = addDays(parseISO(transactionDate), -daysBefore);
  const iso = toISO(remindDate);
  return `${iso}T${String(REMINDER_HOUR_UTC).padStart(2, '0')}:00:00.000Z`;
}
