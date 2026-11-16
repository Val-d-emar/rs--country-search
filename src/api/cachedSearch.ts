import { searchCountries } from './countries.js';
import type { Country } from './types.js';

export type CountrySearchFn = (
  query: string,
  signal?: AbortSignal,
  timeoutMs?: number,
) => Promise<Country[]>;

interface InFlightEntry {
  promise: Promise<Country[]>;
  controller: AbortController;
  subscribers: number;
}

/**
 * Создаёт обёртку над поиском стран с кэшем по строке запроса
 * и дедупликацией одновременных одинаковых запросов («в полёте»).
 */
export function createCachedCountrySearch(
  baseSearch: CountrySearchFn = searchCountries,
): CountrySearchFn {
  const cache = new Map<string, Country[]>();
  const inFlight = new Map<string, InFlightEntry>();

  return (query: string, signal?: AbortSignal, timeoutMs?: number): Promise<Country[]> => {
    if (signal?.aborted) {
      return Promise.reject(signal.reason);
    }

    const key = query.trim().toLowerCase();

    const cached = cache.get(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    let entry = inFlight.get(key);

    if (!entry) {
      const controller = new AbortController();
      const currentEntry: InFlightEntry = {
        controller,
        subscribers: 0,
        promise: Promise.resolve([]),
      };

      currentEntry.promise = baseSearch(query.trim(), controller.signal, timeoutMs)
        .then((countries) => {
          cache.set(key, countries);
          return countries;
        })
        .finally(() => {
          if (inFlight.get(key) === currentEntry) {
            inFlight.delete(key);
          }
        });

      inFlight.set(key, currentEntry);
      entry = currentEntry;
    }

    const activeEntry = entry;
    activeEntry.subscribers += 1;

    if (!signal) {
      return activeEntry.promise.finally(() => {
        activeEntry.subscribers -= 1;
      });
    }

    return new Promise<Country[]>((resolve, reject) => {
      const onAbort = (): void => {
        activeEntry.subscribers -= 1;
        if (activeEntry.subscribers === 0) {
          if (inFlight.get(key) === activeEntry) {
            inFlight.delete(key);
          }
          activeEntry.controller.abort(signal.reason);
        }
        reject(signal.reason);
      };

      signal.addEventListener('abort', onAbort, { once: true });

      activeEntry.promise.then(
        (value) => {
          signal.removeEventListener('abort', onAbort);
          activeEntry.subscribers -= 1;
          resolve(value);
        },
        (error: unknown) => {
          signal.removeEventListener('abort', onAbort);
          activeEntry.subscribers -= 1;
          reject(error);
        },
      );
    });
  };
}
