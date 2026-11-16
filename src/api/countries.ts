import { HttpError } from './errors.js';
import { mapCountryResponse } from './mapper.js';
import type { Country, RawCountry } from './types.js';

const BASE_URL = 'https://countries.dev/name';
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Выполняет поиск стран по имени через countries.dev.
 * - 404 трактуется как пустой результат (`[]`), а не ошибка.
 * - Прочие неуспешные HTTP-статусы выбрасывают `HttpError`.
 * - Отменяется как по внешнему `signal`, так и по таймауту `timeoutMs`.
 */
export async function searchCountries(
  query: string,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Country[]> {
  const url = `${BASE_URL}/${encodeURIComponent(query.trim())}`;

  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const response = await fetch(url, { signal: combinedSignal });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status, `Request failed with status ${response.status}`);
  }

  const rawCountries = (await response.json()) as RawCountry[];
  return rawCountries.map(mapCountryResponse);
}
