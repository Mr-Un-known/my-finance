import { useState } from 'react';
import { localRepository } from '@/data/local/localRepository';
import { db } from '@/data/db';
import { CURRENCIES, currencySample } from '@/domain/money/currencies';
import { DEFAULT_CATEGORIES } from '@/domain/seed/defaultCategories';
import { setMoneyLocale, formatMoney } from '@/domain/money/format';
import { haptic } from '@/lib/haptic';
import { pedirSync } from '@/data/sync/useCloudSync';
import type { Settings } from '@/domain/types';

const PASOS = ['nombre', 'moneda', 'quincenas', 'categorias'] as const;
type Paso = typeof PASOS[number];

/**
 * Configuracion inicial: cuatro preguntas, una por pantalla.
 *
 * Solo pregunta lo que cambia como se ve la app desde el primer segundo
 * (nombre, moneda, dias de quincena, categorias). Todo lo demas tiene un
 * default razonable y se cambia despues en Ajustes — un cuestionario
 * largo antes de poder usar nada es la forma mas rapida de que alguien
 * cierre la app.
 */
export function OnboardingScreen({ settings }: { settings: Settings }) {
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState(settings.displayName);
  const [moneda, setMoneda] = useState(settings.currency);
  const [dias, setDias] = useState<[number, number]>(settings.quincenaStartDays);
  const [elegidas, setElegidas] = useState<Set<string>>(() => new Set(DEFAULT_CATEGORIES.map((c) => c.id)));
  const [guardando, setGuardando] = useState(false);

  const actual: Paso = PASOS[paso] ?? 'nombre';
  const monedaElegida = CURRENCIES.find((c) => c.code === moneda) ?? CURRENCIES[0]!;

  const puedeSeguir =
    actual === 'nombre' ? nombre.trim().length > 0
    : actual === 'categorias' ? elegidas.size > 0
    : true;

  async function terminar() {
    setGuardando(true);
    try {
      await localRepository.saveSettings({
        ...settings,
        displayName: nombre.trim(),
        currency: monedaElegida.code,
        locale: monedaElegida.locale,
        quincenaStartDays: dias,
        onboardedAt: new Date().toISOString(),
      });
      // Las categorías ya están sembradas: se quitan las que no eligió.
      // Por deleteCategory y no db.categories.delete, para que el borrado
      // deje lápida y viaje a los otros dispositivos.
      const todas = await db.categories.toArray();
      for (const c of todas) {
        if (!elegidas.has(c.id)) await localRepository.deleteCategory(c.id);
      }
      setMoneyLocale(monedaElegida.locale, monedaElegida.code);
      haptic('medium');
      // Subir YA. El sync automático ya hizo su push al entrar, o sea antes
      // de que existiera esta configuración; si esperamos al próximo, con
      // cerrar la pestaña alcanza para que nunca llegue a la nube y el
      // siguiente dispositivo vuelva a preguntar todo.
      pedirSync();
    } finally {
      setGuardando(false);
    }
  }

  function siguiente() {
    haptic('light');
    if (paso < PASOS.length - 1) setPaso(paso + 1);
    else void terminar();
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: 'calc(var(--safe-top) + 24px) var(--gap-l) calc(var(--safe-bottom) + 20px)' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }} aria-hidden>
          {PASOS.map((p, i) => (
            <span
              key={p}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i <= paso ? 'var(--q10)' : 'var(--line)',
                transition: 'background var(--dur-med) var(--ease-spring-out)',
              }}
            />
          ))}
        </div>

        <div style={{ flex: 1 }}>
          {actual === 'nombre' && (
            <Pregunta titulo="¿Cómo quieres que te llamemos?" ayuda="Aparece en el saludo del inicio. Nada más.">
              <input
                autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre" aria-label="Tu nombre" maxLength={40}
                onKeyDown={(e) => { if (e.key === 'Enter' && puedeSeguir) siguiente(); }}
                style={{
                  width: '100%', minHeight: 52, padding: '0 16px', borderRadius: 'var(--radius-m)',
                  border: '1px solid var(--line-strong)', background: 'var(--surface)',
                  color: 'var(--text)', fontSize: 18,
                }}
              />
            </Pregunta>
          )}

          {actual === 'moneda' && (
            <Pregunta titulo="¿En qué moneda manejas tu plata?" ayuda="Cambia cómo se escribe cada cifra en toda la app.">
              <div style={{ display: 'grid', gap: 8 }}>
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code} type="button"
                    onClick={() => { haptic('light'); setMoneda(c.code); }}
                    aria-pressed={moneda === c.code}
                    style={opcionStyle(moneda === c.code)}
                  >
                    <span style={{ flex: 1, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontWeight: 600 }}>{c.label}</span>
                      <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{c.code}</span>
                    </span>
                    <span className="figures" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{currencySample(c)}</span>
                  </button>
                ))}
              </div>
            </Pregunta>
          )}

          {actual === 'quincenas' && (
            <Pregunta
              titulo="¿Qué días te pagan?"
              ayuda="La app se organiza por quincenas. Si te pagan una vez al mes, deja los dos días iguales."
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <DiaInput label="Primer pago" valor={dias[0]} onChange={(v) => setDias([v, dias[1]])} />
                <DiaInput label="Segundo pago" valor={dias[1]} onChange={(v) => setDias([dias[0], v])} />
              </div>
              <p style={{ marginTop: 16, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                Quedaría: quincena del {Math.min(...dias)} y quincena del {Math.max(...dias)}.
              </p>
            </Pregunta>
          )}

          {actual === 'categorias' && (
            <Pregunta titulo="¿Cuáles categorías usas?" ayuda="Quita las que no. Puedes agregar más después en Ajustes.">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DEFAULT_CATEGORIES.map((c) => {
                  const activa = elegidas.has(c.id);
                  return (
                    <button
                      key={c.id} type="button"
                      onClick={() => {
                        haptic('light');
                        setElegidas((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                          return next;
                        });
                      }}
                      aria-pressed={activa}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        minHeight: 'var(--tap)', padding: '0 14px', borderRadius: 999,
                        border: `1.5px solid ${activa ? c.color : 'var(--line)'}`,
                        background: activa ? `color-mix(in srgb, ${c.color} 16%, var(--surface))` : 'var(--surface)',
                        color: activa ? c.color : 'var(--text-faint)',
                        fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <span aria-hidden>{c.icon}</span>{c.name}
                    </button>
                  );
                })}
              </div>
              <p style={{ marginTop: 14, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {elegidas.size} seleccionadas · ejemplo: {formatMoney(125_000, monedaElegida.code)}
              </p>
            </Pregunta>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {paso > 0 && (
            <button type="button" onClick={() => setPaso(paso - 1)} style={{ ...botonStyle, flex: 'none', width: 100, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-strong)' }}>
              Atrás
            </button>
          )}
          <button type="button" onClick={siguiente} disabled={!puedeSeguir || guardando} style={{ ...botonStyle, opacity: puedeSeguir ? 1 : 0.5 }}>
            {guardando ? 'Guardando…' : paso === PASOS.length - 1 ? 'Empezar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pregunta({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.022em' }}>{titulo}</h1>
      <p style={{ margin: '0 0 22px', color: 'var(--text-muted)', fontSize: 'var(--text-base)', lineHeight: 'var(--lh-normal)' }}>{ayuda}</p>
      {children}
    </div>
  );
}

function DiaInput({ label, valor, onChange }: { label: string; valor: number; onChange: (v: number) => void }) {
  return (
    <label style={{ flex: 1 }}>
      <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </span>
      <input
        type="number" min={1} max={31} value={valor}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(31, Math.max(1, Math.trunc(n))));
        }}
        className="figures"
        style={{
          width: '100%', minHeight: 52, padding: '0 16px', borderRadius: 'var(--radius-m)',
          border: '1px solid var(--line-strong)', background: 'var(--surface)',
          color: 'var(--text)', fontSize: 20, fontWeight: 700, textAlign: 'center',
        }}
      />
    </label>
  );
}

function opcionStyle(activa: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    minHeight: 56, padding: '0 16px', borderRadius: 'var(--radius-m)',
    border: `1.5px solid ${activa ? 'var(--q10)' : 'var(--line)'}`,
    background: activa ? 'var(--q10-soft)' : 'var(--surface)',
    color: 'var(--text)', cursor: 'pointer', fontSize: 'var(--text-base)',
    transition: 'all var(--dur-fast) var(--ease-spring-out)',
  };
}

const botonStyle: React.CSSProperties = {
  flex: 1, minHeight: 52, borderRadius: 'var(--radius-m)', border: 'none',
  background: 'var(--q10)', color: '#fff', fontWeight: 700, fontSize: 17, cursor: 'pointer',
};
