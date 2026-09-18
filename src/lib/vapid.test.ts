import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './vapid';

describe('urlBase64ToUint8Array', () => {
  it('decodifica un base64url conocido a los bytes correctos', () => {
    // "hola" en utf-8 = [104,111,108,97]; en base64 = "aG9sYQ==";
    // en base64url (sin padding, - en vez de +, _ en vez de /) = "aG9sYQ"
    const result = urlBase64ToUint8Array('aG9sYQ');
    expect(Array.from(result)).toEqual([104, 111, 108, 97]);
  });

  it('maneja correctamente los caracteres - y _ de base64url', () => {
    // bytes [251, 255, 191] -> base64 estandar "+/+/" no aplica aqui;
    // verificamos con un caso real: base64 "Pj4-Pw" contiene "-" que
    // debe convertirse a "+" antes de decodificar.
    const withDash = urlBase64ToUint8Array('Pj4-Pw');
    const standardEquivalent = Uint8Array.from(atob('Pj4+Pw=='), (c) => c.charCodeAt(0));
    expect(Array.from(withDash)).toEqual(Array.from(standardEquivalent));
  });
});
