import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchCountries } from '../../src/api/countries.js';
import { HttpError } from '../../src/api/errors.js';
import type { RawCountry } from '../../src/api/types.js';

const spainRaw: RawCountry = {
  name: 'Spain',
  nativeName: 'España',
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  alpha3Code: 'ESP',
  flags: {
    svg: 'https://flagcdn.com/es.svg',
  },
  borders: ['AND', 'FRA'],
  languages: [{ name: 'Spanish' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
};

describe('searchCountries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('возвращает смаппированный список стран при статусе 200 и кодирует query', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([spainRaw]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchCountries('  spain test  ');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://countries.dev/name/spain%20test',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Spain');
    expect(result[0]?.capital).toBe('Madrid');
  });

  it('возвращает пустой массив при статусе 404 (нет совпадений)', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Country not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchCountries('zzzzzz');

    expect(result).toEqual([]);
  });

  it('бросает HttpError со статусом при других неуспешных ответах (например, 500)', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Server Error', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchCountries('spain')).rejects.toThrowError(HttpError);

    try {
      await searchCountries('spain');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      if (error instanceof HttpError) {
        expect(error.status).toBe(500);
      }
    }
  });

  it('прерывает запрос с AbortError при отмене переданного внешнего signal', async () => {
    const controller = new AbortController();

    const fetchMock = vi.fn<typeof fetch>((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('Expected AbortSignal'));
          return;
        }
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener('abort', () => {
          reject(signal.reason);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = searchCountries('spain', controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('прерывает запрос с TimeoutError при превышении времени ожидания', async () => {
    const controller = new AbortController();

    const fetchMock = vi.fn<typeof fetch>((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('Expected AbortSignal'));
          return;
        }
        signal.addEventListener('abort', () => {
          reject(signal.reason);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = searchCountries('spain', controller.signal, 20);

    await expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
