import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController, type SearchState } from '../../src/search/searchController.js';
import type { RawCountry } from '../../src/api/types.js';

const slowCountryRaw: RawCountry = {
  name: 'Singapore',
  capital: 'Singapore',
  region: 'Asia',
  population: 5685807,
  alpha3Code: 'SGP',
  flags: { svg: 'https://flagcdn.com/sg.svg' },
};

const fastCountryRaw: RawCountry = {
  name: 'Spain',
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  alpha3Code: 'ESP',
  flags: { svg: 'https://flagcdn.com/es.svg' },
};

describe('search race condition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('отменяет устаревший запрос через AbortController и не даёт ему перезаписать более поздний результат', async () => {
    const signals: AbortSignal[] = [];
    const rejectedReasons: unknown[] = [];

    const fetchMock = vi.fn<typeof fetch>((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const signal = init?.signal;
      if (signal) {
        signals.push(signal);
      }

      const isSlowRequest = url.endsWith('/sp');
      const delay = isSlowRequest ? 1000 : 50;
      const payload = isSlowRequest ? [slowCountryRaw] : [fastCountryRaw];

      const promise = new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(new Response(JSON.stringify(payload), { status: 200 }));
        }, delay);

        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(signal.reason);
        });
      });

      promise.catch((reason: unknown) => {
        rejectedReasons.push(reason);
      });

      return promise;
    });

    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = createSearchController((state) => states.push(state), { debounceMs: 300 });

    controller.search('sp');
    await vi.advanceTimersByTimeAsync(300);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(100);
    controller.search('spain');

    expect(signals[0]?.aborted).toBe(true);
    await Promise.resolve();
    expect(rejectedReasons).toHaveLength(1);
    expect(rejectedReasons[0]).toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(350);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const stateAfterFastResponse = states.at(-1);
    expect(stateAfterFastResponse?.status).toBe('success');
    if (stateAfterFastResponse?.status === 'success') {
      expect(stateAfterFastResponse.countries.map((c) => c.name)).toEqual(['Spain']);
    }

    await vi.advanceTimersByTimeAsync(1000);

    const finalState = states.at(-1);
    expect(finalState?.status).toBe('success');
    if (finalState?.status === 'success') {
      expect(finalState.query).toBe('spain');
      expect(finalState.countries.map((c) => c.name)).toEqual(['Spain']);
    }

    expect(states.some((s) => s.status === 'error')).toBe(false);
  });
});
