import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Screen } from '@/components/ui/Screen';
import { localRepository } from '@/data/local/localRepository';
import { exportBackupJSON, exportTransactionsCSV, parseBackupFile, importBackup, type BackupPreview } from '@/data/backup/exportImport';
import type { Backup } from '@/data/backup/schema';
import type { Settings } from '@/domain/types';
import { ImportPreviewSheet } from './ImportPreviewSheet';
import { CloudSection } from './CloudSection';
import { NotificationsSection } from '@/features/notifications/NotificationsSection';

const THEMES: Array<{ value: Settings['theme']; label: string }> = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export function SettingsScreen() {
  const settings = useLiveQuery(() => localRepository.getSettings(), []);
  const paymentMethods = useLiveQuery(() => localRepository.listPaymentMethods(), []) ?? [];
  const creditMethod = paymentMethods.find((m) => m.type === 'credit');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<
    { status: 'idle' } | { status: 'error'; message: string } | { status: 'preview'; backup: Backup; preview: BackupPreview }
  >({ status: 'idle' });
  const [busy, setBusy] = useState<string | null>(null);

  if (!settings) return null;

  function patch(partial: Partial<Settings>) {
    void localRepository.saveSettings({ ...settings!, ...partial });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const result = parseBackupFile(text);
    if (!result.success) {
      setImportState({ status: 'error', message: result.error });
      return;
    }
    setImportState({ status: 'preview', backup: result.backup, preview: result.preview });
  }

  async function confirmImport() {
    if (importState.status !== 'preview') return;
    setBusy('import');
    try {
      await importBackup(importState.backup);
      setImportState({ status: 'idle' });
    } finally {
      setBusy(null);
    }
  }

  async function handleExportJSON() {
    setBusy('json');
    try { await exportBackupJSON(); } finally { setBusy(null); }
  }
  async function handleExportCSV() {
    setBusy('csv');
    try { await exportTransactionsCSV(); } finally { setBusy(null); }
  }

  return (
    <Screen title="Ajustes" subtitle="Moneda, quincenas y tarjeta">
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Tema</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {THEMES.map((t) => (
            <button key={t.value} type="button" onClick={() => patch({ theme: t.value })} aria-pressed={settings.theme === t.value} style={segmentStyle(settings.theme === t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Moneda y región</h2>
        <Row label="Moneda">
          <input
            defaultValue={settings.currency}
            onBlur={(e) => patch({ currency: e.target.value.trim().toUpperCase() || 'COP' })}
            maxLength={3}
            className="figures"
            style={smallInputStyle}
          />
        </Row>
        <Row label="Formato">
          <input
            defaultValue={settings.locale}
            onBlur={(e) => patch({ locale: e.target.value.trim() || 'es-CO' })}
            style={smallInputStyle}
          />
        </Row>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Quincenas</h2>
        <Row label="Primera empieza el día">
          <NumberInput
            value={settings.quincenaStartDays[0]}
            onCommit={(v) => patch({ quincenaStartDays: [v, settings.quincenaStartDays[1]] })}
          />
        </Row>
        <Row label="Segunda empieza el día">
          <NumberInput
            value={settings.quincenaStartDays[1]}
            onCommit={(v) => patch({ quincenaStartDays: [settings.quincenaStartDays[0], v] })}
          />
        </Row>
      </section>

      {creditMethod && (
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Tarjeta de crédito</h2>
          <Row label="Día de corte">
            <NumberInput
              value={creditMethod.cutoffDay ?? 15}
              onCommit={(v) => void localRepository.savePaymentMethod({ ...creditMethod, cutoffDay: v })}
            />
          </Row>
          <Row label="Día de pago">
            <NumberInput
              value={creditMethod.paymentDay ?? 2}
              onCommit={(v) => void localRepository.savePaymentMethod({ ...creditMethod, paymentDay: v })}
            />
          </Row>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '4px 0 0' }}>
            Solo aplica a compras nuevas — las que ya hiciste conservan su fecha de pago original.
          </p>
        </section>
      )}

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Recordatorios</h2>
        <Row label="Avisar con">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NumberInput value={settings.reminderDefaultDaysBefore} min={0} onCommit={(v) => patch({ reminderDefaultDaysBefore: v })} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>día(s) antes</span>
          </div>
        </Row>
      </section>

      <section style={{ ...sectionStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={sectionTitle}>Organizar</h2>
        <NavLink to="/ajustes/categorias" label="Categorías" />
        <NavLink to="/ajustes/recurrentes" label="Recurrentes" />
        <NavLink to="/ajustes/presupuestos" label="Presupuestos" />
      </section>

      <CloudSection />
      <NotificationsSection />

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Tus datos</h2>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '0 0 12px' }}>
          Exporta cuando quieras — no quedas encerrado en la app.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button type="button" onClick={handleExportJSON} disabled={busy === 'json'} style={secondaryButtonStyle}>
            {busy === 'json' ? 'Exportando…' : 'Exportar JSON'}
          </button>
          <button type="button" onClick={handleExportCSV} disabled={busy === 'csv'} style={secondaryButtonStyle}>
            {busy === 'csv' ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...secondaryButtonStyle, width: '100%' }}>
          Importar backup (JSON)
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} style={{ display: 'none' }} />
        {importState.status === 'error' && (
          <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{importState.message}</p>
        )}
      </section>

      {importState.status === 'preview' && (
        <ImportPreviewSheet
          preview={importState.preview}
          onConfirm={confirmImport}
          onCancel={() => setImportState({ status: 'idle' })}
        />
      )}
    </Screen>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{label}</span>
      {children}
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 'var(--tap)', padding: '0 14px', borderRadius: 'var(--radius-s)', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>
      {label}
      <span aria-hidden style={{ color: 'var(--text-faint)' }}>›</span>
    </Link>
  );
}

function NumberInput({ value, onCommit, min = 1, max = 31 }: { value: number; onCommit: (v: number) => void; min?: number; max?: number }) {
  const [text, setText] = useState(String(value));
  return (
    <input
      type="number" inputMode="numeric" min={min} max={max} value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Math.min(max, Math.max(min, Number(text) || value));
        setText(String(n));
        if (n !== value) onCommit(n);
      }}
      className="figures"
      style={smallInputStyle}
    />
  );
}

const sectionStyle: React.CSSProperties = { marginBottom: 'var(--gap-xl)' };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 10px' };
const smallInputStyle: React.CSSProperties = { width: 72, minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'right', fontSize: 14 };
function segmentStyle(active: boolean): React.CSSProperties {
  return { flex: 1, minHeight: 'var(--tap)', borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)', background: active ? 'var(--text)' : 'var(--surface)', color: active ? 'var(--surface)' : 'var(--text)', fontWeight: 600, cursor: 'pointer' };
}
const secondaryButtonStyle: React.CSSProperties = { flex: 1, minHeight: 44, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' };
