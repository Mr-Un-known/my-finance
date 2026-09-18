import type { ReactNode } from 'react';

/**
 * Los dos rotulos de formulario de la app, para no repetir la decision
 * en cada pantalla.
 *
 * Existen porque habia 17 `<label>` sueltos y ninguno estaba asociado a
 * nada: un lector de pantalla entraba al campo y anunciaba "campo de
 * texto", sin decir cual. Y la mitad de esos `<label>` ni siquiera
 * rotulaban un campo — rotulaban un grupo de botones (Categoria, Metodo de
 * pago, Frecuencia), donde `<label>` es directamente el elemento
 * equivocado: no le falta un atributo, le falta ser otra cosa.
 */

const estiloRotulo: React.CSSProperties = {
  display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600,
  color: 'var(--text-muted)', margin: '0 0 6px',
  textTransform: 'uppercase', letterSpacing: '0.03em',
};

/** Rotulo de UN control. `htmlFor` tiene que coincidir con el id del input. */
export function Field({ label, htmlFor, children }: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <>
      <label htmlFor={htmlFor} style={estiloRotulo}>{label}</label>
      {children}
    </>
  );
}

/**
 * Rotulo de un GRUPO de controles (chips, segmentos). Usa role="group" +
 * aria-labelledby, que es lo que un lector de pantalla necesita para decir
 * "Categoria, grupo" antes de leer las opciones.
 */
export function FieldGroup({ label, id, children, style }: {
  label: string;
  id: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <span id={`${id}-rotulo`} style={estiloRotulo}>{label}</span>
      <div role="group" aria-labelledby={`${id}-rotulo`} style={style}>
        {children}
      </div>
    </>
  );
}
