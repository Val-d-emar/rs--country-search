import { describe, expect, it, vi } from 'vitest';
import { createCachedCountrySearch, type CountrySearchFn } from '../../src/api/cachedSearch.js';
import type { Country } from '../../src/api/types.js';

const spain: Country = {
  name: 'Spain',
  nativeName: 'España',
  flagUrl: 'https://flagcdn.com/es.svg',
  flagAlt: 'Flag of Spain',
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  alpha3Code: 'ESP',
  languages: ['Spanish'],
  currencies: ['Euro (EUR, €)'],
  borders: ['AND', 'FRA'],
};

describe('createCachedCountrySearch', () => {
  it('возвращает результат из кэша при повторном запросе без вызова сети', async () => {
    const baseSearch = vi.fn<CountrySearchFn>().mockResolvedValue([spain]);
    const cachedSearch = createCachedCountrySearch(baseSearch);

    const first = await cachedSearch('Spain');
    const second = await cachedSearch('  spain  ');

    expect(baseSearch).toHaveBeenCalledTimes(1);
    expect(first).toEqual([spain]);
    expect(second).toEqual([spain]);
  });

  it('не кэширует ошибки и позволяет повторить запрос', async () => {
    const baseSearch = vi
      .fn<CountrySearchFn>()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([spain]);
    const cachedSearch = createCachedCountrySearch(baseSearch);

    await expect(cachedSearch('spain')).rejects.toThrow('Network error');

    const result = await cachedSearch('spain');
    expect(baseSearch).toHaveBeenCalledTimes(2);
    expect(result).toEqual([spain]);
  });

  it('дедуплицирует одновременные одинаковые запросы в полёте', async () => {
    let resolveRequest!: (value: Country[]) => void;
    const baseSearch = vi.fn<CountrySearchFn>(
      () =>
        new Promise<Country[]>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const cachedSearch = createCachedCountrySearch(baseSearch);

    const promise1 = cachedSearch('spain');
    const promise2 = cachedSearch('Spain');

    expect(baseSearch).toHaveBeenCalledTimes(1);

    resolveRequest([spain]);
    const [res1, res2] = await Promise.all([promise1, promise2]);

    expect(res1).toEqual([spain]);
    expect(res2).toEqual([spain]);
  });

  it('при отмене одного из вызывающих не рушит общий запрос в полёте для другого', async () => {
    let resolveRequest!: (value: Country[]) => void;
    const baseSearch = vi.fn<CountrySearchFn>(
      () =>
        new Promise<Country[]>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const cachedSearch = createCachedCountrySearch(baseSearch);

    const controllerA = new AbortController();
    const controllerB = new AbortController();

    const promiseA = cachedSearch('spain', controllerA.signal);
    const promiseB = cachedSearch('spain', controllerB.signal);

    controllerA.abort();
    await expect(promiseA).rejects.toMatchObject({ name: 'AbortError' });

    resolveRequest([spain]);
    await expect(promiseB).resolves.toEqual([spain]);
  });

  it('реально отменяет сетевой запрос, если отменился единственный подписчик', async () => {
    let receivedSignal: AbortSignal | undefined;
    const baseSearch = vi.fn<CountrySearchFn>((_q, signal) => {
      receivedSignal = signal;
      return new Promise<Country[]>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason));
      });
    });

    const cachedSearch = createCachedCountrySearch(baseSearch);
    const controller = new AbortController();

    const promise = cachedSearch('spain', controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(receivedSignal?.aborted).toBe(true);
  });
});
