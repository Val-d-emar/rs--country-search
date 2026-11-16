import { searchCountries } from './countries.js';
import type { Country } from './types.js';

export type CountrySearchFn = (
  query: string,
  signal?: AbortSignal,
  timeoutMs?: number,
) => Promise<Country[]>;

/**
 * Оборачивает общий промис так, чтобы конкретный вызывающий мог отменить
 * ожидание по своему `signal`, не прерывая общий сетевой запрос для остальных.
 */
function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(signal.reason);
    };

    signal.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Создаёт обёртку над поиском стран с кэшем по строке запроса
 * и дедупликацией одновременных одинаковых запросов («в полёте»).
 */
export function createCachedCountrySearch(
  baseSearch: CountrySearchFn = searchCountries,
): CountrySearchFn {
  const cache = new Map<string, Country[]>();
  const inFlight = new Map<string, Promise<Country[]>>();

  return async (query: string, signal?: AbortSignal, timeoutMs?: number): Promise<Country[]> => {
    if (signal?.aborted) {
      return Promise.reject(signal.reason);
    }

    const key = query.trim().toLowerCase();

    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    let sharedPromise = inFlight.get(key);

    if (!sharedPromise) {
      sharedPromise = baseSearch(query.trim(), undefined, timeoutMs)
        .then((countries) => {
          cache.set(key, countries);
          return countries;
        })
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, sharedPromise);
    }

    return raceWithAbort(sharedPromise, signal);
  };
}
