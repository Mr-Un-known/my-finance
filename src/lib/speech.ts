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
export function escuchar(opciones: {
  lang?: string;
  onTexto: (texto: string, final: boolean) => void;
  onError: (mensaje: string) => void;
  onFin: () => void;
}): Reconocedor | null {
  const Ctor = constructor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = opciones.lang ?? 'es-CO';
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (e) => {
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
        : 'No pude escuchar. Escríbelo y listo.',
    );
  };

  rec.onend = opciones.onFin;

  try {
    rec.start();
  } catch {
    return null;
  }
  return { start: () => rec.start(), stop: () => rec.stop() };
}
