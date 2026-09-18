import type { ReactNode } from 'react';

/** Contenedor estándar: un solo ancho, un solo padding, en toda la app. */
export function Screen({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 var(--gap-l)' }}>
      <header style={{ marginBottom: 'var(--gap-l)' }}>
        <h1
          className="figures"
          style={{ margin: 0, fontSize: 'var(--step-3)', fontWeight: 700 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '2px 0 0', color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </header>
      {children}
    </div>
  );
}
