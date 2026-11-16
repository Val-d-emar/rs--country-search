import { describe, expect, it } from 'vitest';
import { HttpError } from '../../src/api/errors.js';
import { classifyError } from '../../src/search/classifyError.js';

describe('classifyError', () => {
  it('распознаёт AbortError как отмену запроса пользователем', () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');

    expect(classifyError(abortError)).toEqual({ kind: 'abort' });
  });

  it('распознаёт TimeoutError как ошибку таймаута (отдельно от AbortError)', () => {
    const timeoutError = new DOMException('The operation timed out', 'TimeoutError');

    expect(classifyError(timeoutError)).toEqual({ kind: 'timeout' });
  });

  it('распознаёт HttpError и сохраняет статус ответа', () => {
    const httpError = new HttpError(503, 'Service Unavailable');

    expect(classifyError(httpError)).toEqual({
      kind: 'http',
      status: 503,
      message: 'Service Unavailable',
    });
  });

  it('трактует прочие ошибки (например, обрыв сети TypeError) как network', () => {
    const networkError = new TypeError('Failed to fetch');

    expect(classifyError(networkError)).toEqual({
      kind: 'network',
      message: 'Failed to fetch',
    });
  });

  it('безопасно обрабатывает не-Error значения', () => {
    expect(classifyError('unexpected')).toEqual({
      kind: 'network',
      message: 'Unknown error',
    });
  });
});
