import { NavLink, useNavigate } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Inicio', icon: 'M3 10.5 12 3l9 7.5V21H3z' },
  { to: '/movimientos', label: 'Movimientos', icon: 'M4 7h16M4 12h16M4 17h10' },
  { to: '/calendario', label: 'Calendario', icon: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4' },
  { to: '/analisis', label: 'Análisis', icon: 'M5 20V10M12 20V4M19 20v-7' },
  { to: '/ajustes', label: 'Ajustes', icon: 'M4 7h16M4 17h16M9 7v0M15 17v0' },
] as const;

export function TabBar() {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Navegación principal"
      style={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
        background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        backdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      {TABS.map((tab, i) => (
        <div key={tab.to} style={{ display: 'contents' }}>
          {i === 2 && <AddButton onClick={() => navigate('/movimientos?nuevo=1')} />}
          <NavLink
            to={tab.to}
            end={tab.to === '/'}
            style={({ isActive }) => ({
              minHeight: 'var(--tap)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '8px 0 10px',
              textDecoration: 'none',
              color: isActive ? 'var(--text)' : 'var(--text-faint)',
              fontSize: 10,
              fontWeight: isActive ? 600 : 500,
            })}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={tab.icon}
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {tab.label}
          </NavLink>
        </div>
      ))}
    </nav>
  );
}

/**
 * El "+" no es una pestaña: es una acción. Flota SOBRE el tab bar, no
 * dentro — con bottom pequeño se comía la pestaña central (Calendario).
 */
function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Agregar movimiento"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 'calc(100% + 12px)',
        transform: 'translateX(-50%)',
        width: 56,
        height: 56,
        borderRadius: 28,
        border: 'none',
        background: 'var(--text)',
        color: 'var(--surface)',
        fontSize: 26,
        lineHeight: 1,
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgb(0 0 0 / 0.22)',
      }}
    >
      +
    </button>
  );
}
