/**
 * Dictado por voz del navegador (Web Speech API).
 *
 * Safari lo expone como webkitSpeechRecognition y NO esta en todos lados:
 * falta en varios navegadores y es irregular dentro de una web app
 * instalada. Por eso esto devuelve `null` cuando no hay soporte y la
 * pantalla que lo usa siempre ofrece escribir — dictar es el atajo, no el
 * unico camino.
 *
 * TypeScript no trae los tipos de esta API, asi que van declarados aca,
 * minimos: solo lo que se usa.
 */

interface SpeechResultAlt { transcript: string }
interface SpeechResult { 0: SpeechResultAlt; isFinal: boolean; length: number }
interface SpeechResultList { length: number; [i: number]: SpeechResult }
interface SpeechEvent { resultIndex: number; results: SpeechResultList }
interface SpeechErrorEvent { error: string }

export interface Reconocedor {
  start(): void;
  stop(): void;
}

type Constructor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

function constructor(): Constructor | null {
  const w = window as unknown as {
    SpeechRecognition?: Constructor;
    webkitSpeechRecognition?: Constructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function hayDictado(): boolean {
  return typeof window !== 'undefined' && constructor() !== null;
}

/**
 * Arranca el dictado. `onTexto` recibe el texto parcial mientras habla y
 * el final cuando termina — mostrar el parcial es lo que hace que se
 * sienta que te esta escuchando.
 */
/**
 * El reconocedor que esta vivo ahora mismo, si hay alguno.
 *
 * Hace falta porque start() sobre uno que ya corre lanza InvalidStateError,
 * y basta con que uno quede sin cerrar —la pestaña perdio el foco, la hoja
 * se cerro a mitad, iOS lo mato por su cuenta— para que el siguiente
 * intento falle. Antes eso se reportaba como "este navegador no deja
 * dictar", que es mentira y deja a la persona sin salida: es exactamente la
 * forma que tiene "a veces no funciona". Ahora se suelta el anterior antes
 * de pedir uno nuevo.
 */
let activo: { abort(): void } | null = null;

/**
 * Cuanto se espera sin noticias antes de darse por vencido.
 *
 * El reconocedor deberia avisar siempre con onend o con onerror, pero no
 * siempre lo hace: si el microfono lo tiene otra app, si el permiso se
 * queda a medias, o por errores conocidos de Safari, no llega nada. Sin
 * esto el boton se queda en "Dejar de escuchar" para siempre, no hay forma
 * de recuperarlo sin recargar, y parece que la app se colgo.
 *
 * El contador se reinicia con cada palabra que llega, asi que solo salta
 * cuando de verdad no esta pasando nada.
 *
 * Cuatro segundos. Doce se sentian eternos con el boton en rojo sin que
 * pasara nada. El precio: si alguien toca el microfono y tarda mas de eso
 * en arrancar a hablar, se cancela y tiene que volver a tocarlo.
 */
const SIN_NOTICIAS_MS = 4_000;

export function escuchar(opciones: {
  lang?: string;
  onTexto: (texto: string, final: boolean) => void;
  onError: (mensaje: string) => void;
  onFin: () => void;
}): Reconocedor | null {
  const Ctor = constructor();
  if (!Ctor) return null;

  // Soltar el anterior pase lo que pase: abort() sobre uno ya muerto no
  // hace nada, y dejarlo vivo es lo que rompe el siguiente intento.
  try {
    activo?.abort();
  } catch {
    // Da igual por que fallo; lo que importa es no quedarse con la
    // referencia vieja.
  }
  activo = null;

  const rec = new Ctor();
  rec.lang = opciones.lang ?? 'es-CO';
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let vigilante: ReturnType<typeof setTimeout> | undefined;
  let terminado = false;

  function terminar() {
    if (terminado) return;
    terminado = true;
    clearTimeout(vigilante);
    if (activo === rec) activo = null;
    opciones.onFin();
  }

  function rearmarVigilante() {
    clearTimeout(vigilante);
    vigilante = setTimeout(() => {
      // Cerrar de verdad, no solo en la pantalla: si el reconocedor sigue
      // vivo, retiene el microfono y rompe el proximo intento.
      try {
        rec.abort();
      } catch {
        // Ya estaba muerto.
      }
      opciones.onError('Se quedó esperando. Vuelve a intentarlo o escríbelo.');
      terminar();
    }, SIN_NOTICIAS_MS);
  }

  rec.onresult = (e) => {
    rearmarVigilante();
    let texto = '';
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i]!;
      texto += r[0].transcript;
      if (r.isFinal) final = true;
    }
    opciones.onTexto(texto.trim(), final);
  };

  rec.onerror = (e) => {
    opciones.onError(
      e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'No me diste permiso para usar el micrófono.'
        : e.error === 'no-speech'
        ? 'No escuché nada.'
        : e.error === 'audio-capture'
        ? 'No encontré el micrófono.'
        : 'No pude escuchar. Escríbelo y listo.',
    );
  };

  rec.onend = terminar;

  try {
    rec.start();
  } catch {
    // Un segundo intento: el abort() de arriba puede tardar un instante en
    // soltar el microfono, y este es justo el caso que dejaba el dictado
    // inservible hasta recargar.
    try {
      rec.abort();
      rec.start();
    } catch {
      return null;
    }
  }

  activo = rec;
  rearmarVigilante();

  return {
    start: () => rec.start(),
    stop: () => {
      clearTimeout(vigilante);
      rec.stop();
    },
  };
}
