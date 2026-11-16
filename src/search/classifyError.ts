import { HttpError } from '../api/errors.js';

export type ClassifiedError =
  | { kind: 'abort' }
  | { kind: 'timeout' }
  | { kind: 'http'; status: number; message: string }
  | { kind: 'network'; message: string };

/**
 * Классифицирует ошибку запроса, чётко разделяя:
 * - отмену пользователем (AbortError)
 * - таймаут (TimeoutError)
 * - HTTP-ошибку (HttpError)
 * - сетевую или прочую непредвиденную ошибку
 */
export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof HttpError) {
    return {
      kind: 'http',
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof Error || error instanceof DOMException) {
    if (error.name === 'AbortError') {
      return { kind: 'abort' };
    }
    if (error.name === 'TimeoutError') {
      return { kind: 'timeout' };
    }
    return {
      kind: 'network',
      message: error.message,
    };
  }

  return {
    kind: 'network',
    message: 'Unknown error',
  };
}
