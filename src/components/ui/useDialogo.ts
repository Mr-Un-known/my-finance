import { useEffect, useRef } from 'react';

/**
 * Lo que un diálogo modal debe hacer con el teclado, en un solo lugar.
 *
 * La app tiene once hojas modales y ninguna lo hacía: con Tab el foco se
 * iba a los botones de ATRÁS del modal, que siguen ahí y siguen siendo
 * clicables. Para alguien que navega con teclado o con lector de pantalla,
 * el modal no existe: escribe dentro de una ventana y el foco aparece en
 * la pantalla de abajo. Escape tampoco cerraba, y al cerrar el foco se
 * perdía al principio de la página en vez de volver al botón que lo abrió.
 *
 * Tres cosas: encerrar el Tab, cerrar con Escape, y devolver el foco.
 */
const FOCUSABLES = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * `activo` hace falta para los diálogos que son JSX suelto dentro de una
 * pantalla que nunca se desmonta: ahí el efecto correría una sola vez, al
 * montar la pantalla, cuando el diálogo todavía no existe. Los que son su
 * propio componente se montan y desmontan solos y no necesitan pasarlo.
 */
export function useDialogo<T extends HTMLElement = HTMLDivElement>(
  onCerrar: () => void,
  activo = true,
) {
  const ref = useRef<T>(null);
  // El callback en una ref: si no, cada render cambia su identidad y el
  // efecto se volvería a montar, robando el foco mientras el usuario
  // escribe.
  const cerrarRef = useRef(onCerrar);
  useEffect(() => {
    cerrarRef.current = onCerrar;
  });

  useEffect(() => {
    if (!activo) return;
    const nodo = ref.current;
    if (!nodo) return;

    // A dónde volver al cerrar: casi siempre el botón que abrió esto.
    const anterior = document.activeElement as HTMLElement | null;

    // Respeta un autoFocus que ya haya puesto el foco adentro; si no hay,
    // lo lleva al primer control, y si no hay ninguno, al contenedor.
    if (!nodo.contains(document.activeElement)) {
      const primero = nodo.querySelector<HTMLElement>(FOCUSABLES);
      if (primero) {
        primero.focus();
      } else {
        nodo.tabIndex = -1;
        nodo.focus();
      }
    }

    function visibles(nodo: HTMLElement): HTMLElement[] {
      // offsetParent descarta lo que está oculto; un control dentro de una
      // sección colapsada no debe recibir el foco.
      return Array.from(nodo.querySelectorAll<HTMLElement>(FOCUSABLES))
        .filter((el) => el.offsetParent !== null);
    }

    function onKeyDown(e: KeyboardEvent) {
      const actual = ref.current;
      if (!actual) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        // stopPropagation: con dos modales abiertos, Escape cierra el de
        // arriba y no los dos de un golpe.
        e.stopPropagation();
        cerrarRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const lista = visibles(actual);
      if (lista.length === 0) {
        e.preventDefault();
        return;
      }

      // Se toma el control del Tab entero, no solo de los extremos.
      //
      // Corregir únicamente el primero y el último alcanza en Chrome, pero
      // no en Safari —que es donde vive esta app—: WebKit manda el foco al
      // <body> ENTRE un control y el siguiente, y eso pasa después de este
      // evento, así que no hay forma de corregirlo a tiempo. Moviendo el
      // foco a mano, el recorrido es el mismo en todos los navegadores y
      // nunca sale del diálogo, ni de paso.
      e.preventDefault();
      const actualIdx = lista.indexOf(document.activeElement as HTMLElement);
      const siguiente = actualIdx === -1
        ? 0
        : (actualIdx + (e.shiftKey ? -1 : 1) + lista.length) % lista.length;
      lista[siguiente]!.focus();
    }

    // En captura: así llega antes que cualquier handler de la pantalla.
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // isConnected: si lo que abrió el modal ya no está en el DOM,
      // enfocarlo no hace nada y tira el foco al body.
      if (anterior?.isConnected) anterior.focus();
    };
  }, [activo]);

  return ref;
}
