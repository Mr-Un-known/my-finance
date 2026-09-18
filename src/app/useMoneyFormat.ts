import { useLiveQuery } from 'dexie-react-hooks';
import { localRepository } from '@/data/local/localRepository';
import { setMoneyLocale } from '@/domain/money/format';

/**
 * Conecta la moneda elegida en la configuracion con formatMoney().
 *
 * Se aplica DURANTE el render, no en un useEffect: los hijos formatean
 * plata en su propio render y un efecto llegaria un frame tarde — se veria
 * un parpadeo de "$" a "€" al cambiar de moneda. Es idempotente, asi que
 * repetirlo en cada render no cuesta nada.
 */
export function useMoneyFormat() {
  const settings = useLiveQuery(() => localRepository.getSettings(), []);
  if (settings) setMoneyLocale(settings.locale, settings.currency);
  return settings;
}
