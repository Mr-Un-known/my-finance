import type { ReactNode } from 'react';

/** Contenedor estándar: un solo ancho, un solo padding, en toda la app.
 *  Header con large title iOS 18 (34pt SF Pro Rounded). Slot `right` para
 *  acciones contextuales (botones de filtro, edit, etc). */
export function Screen({ title, subtitle, right, children }: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 var(--gap-l)' }}>
      <header
        style={{
          marginBottom: 'var(--gap-l)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            className="figures"
            style={{
              margin: 0,
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              letterSpacing: '-0.022em',
              lineHeight: 'var(--lh-tight)',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                margin: '2px 0 0',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-base)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {right && <div style={{ flex: 'none' }}>{right}</div>}
      </header>
      {children}
    </div>
  );
}
