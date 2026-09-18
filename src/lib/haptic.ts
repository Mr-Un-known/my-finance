/**
 * Helper de haptic feedback para iOS PWA (soporte desde iOS 16.4+).
 * En dispositivos sin soporte, es no-op silencioso.
 */

type Intensity = 'light' | 'medium' | 'heavy';

const durations: Record<Intensity, number> = {
  light: 10,
  medium: 20,
  heavy: 30,
};

export function haptic(intensity: Intensity = 'light'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(durations[intensity]);
  }
}
