import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController, type SearchState } from '../../src/search/searchController.js';
import type { RawCountry } from '../../src/api/types.js';

const spainRaw: RawCountry = {
  name: 'Spain',
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  alpha3Code: 'ESP',
  flags: { svg: 'https://flagcdn.com/es.svg' },
};

describe('createSearchController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('при пустом вводе очищает состояние в idle и не отправляет запрос', () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = createSearchController((state) => states.push(state));

    controller.search('   ');
    vi.advanceTimersByTime(500);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(states.at(-1)).toEqual({ status: 'idle' });
  });

  it('переходит в success после дебаунса и успешного ответа', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([spainRaw]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = createSearchController((state) => states.push(state), { debounceMs: 300 });

    controller.search('spain');
    expect(states.at(-1)).toEqual({ status: 'loading', query: 'spain' });

    await vi.advanceTimersByTimeAsync(300);

    const lastState = states.at(-1);
    expect(lastState?.status).toBe('success');
    if (lastState?.status === 'success') {
      expect(lastState.query).toBe('spain');
      expect(lastState.countries).toHaveLength(1);
      expect(lastState.countries[0]?.name).toBe('Spain');
    }
  });

  it('переходит в empty (не ошибку) при ответе 404', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Not Found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = createSearchController((state) => states.push(state), { debounceMs: 300 });

    controller.search('zzzzzz');
    await vi.advanceTimersByTimeAsync(300);

    expect(states.at(-1)).toEqual({ status: 'empty', query: 'zzzzzz' });
  });

  it('переходит в error при статусе 500 и позволяет повторить последний запрос через retry()', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([spainRaw]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = createSearchController((state) => states.push(state), { debounceMs: 300 });

    controller.search('spain');
    await vi.advanceTimersByTimeAsync(300);

    expect(states.at(-1)?.status).toBe('error');

    controller.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(states.at(-1)?.status).toBe('success');
  });

  it('переходит в error при TimeoutError', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('Timeout', 'TimeoutError'));
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = createSearchController((state) => states.push(state), { debounceMs: 300 });

    controller.search('spain');
    await vi.advanceTimersByTimeAsync(300);

    const lastState = states.at(-1);
    expect(lastState?.status).toBe('error');
  });

  it('не показывает ошибку пользователю при AbortError', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = createSearchController((state) => states.push(state), { debounceMs: 300 });

    controller.search('spain');
    await vi.advanceTimersByTimeAsync(300);

    expect(states.some((s) => s.status === 'error')).toBe(false);
  });
});
