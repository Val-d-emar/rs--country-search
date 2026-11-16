import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../../src/utils/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('не вызывает функцию сразу и до истечения задержки', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
  });

  it('вызывает функцию один раз после истечения задержки', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('сбрасывает таймер при повторном вызове до истечения задержки', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(200);

    debounced();

    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('передаёт в функцию аргументы последнего вызова', () => {
    const fn = vi.fn<(query: string, limit: number) => void>();
    const debounced = debounce(fn, 300);

    debounced('sp', 5);
    vi.advanceTimersByTime(100);
    debounced('spa', 10);
    vi.advanceTimersByTime(100);
    debounced('spain', 20);

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('spain', 20);
  });

  it('позволяет повторно вызывать функцию после завершения предыдущего цикла', () => {
    const fn = vi.fn<(query: string) => void>();
    const debounced = debounce(fn, 300);

    debounced('spain');
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('spain');

    debounced('france');
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('france');
  });
});
