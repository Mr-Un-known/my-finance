/**
 * "Que dia es hoy" para prellenar formularios. A proposito usa la hora
 * LOCAL del dispositivo (es literalmente el hoy del usuario) — distinto
 * de domain/dates.ts, que nunca debe depender de zona horaria porque
 * calcula ciclos y quincenas a partir de una fecha ya dada.
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
