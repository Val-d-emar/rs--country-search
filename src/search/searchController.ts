import { searchCountries } from '../api/countries.js';
import type { Country } from '../api/types.js';
import { debounce } from '../utils/debounce.js';
import { classifyError, type ClassifiedError } from './classifyError.js';
import type { CountrySearchFn } from '../api/cachedSearch.js';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; countries: Country[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; message: string };

export interface SearchControllerOptions {
  debounceMs?: number;
  timeoutMs?: number;
  searchFn?: CountrySearchFn;
}

export interface SearchController {
  search: (rawQuery: string) => void;
  retry: () => void;
  searchImmediate: (rawQuery: string) => void;
}

function formatErrorMessage(error: Exclude<ClassifiedError, { kind: 'abort' }>): string {
  switch (error.kind) {
    case 'timeout':
      return 'Превышено время ожидания ответа от сервера. Попробуйте ещё раз.';
    case 'http':
      return `Ошибка сервера (${error.status}). Попробуйте повторить запрос.`;
    case 'network':
      return 'Не удалось выполнить запрос. Проверьте подключение к сети.';
  }
}

/**
 * Создаёт контроллер живого поиска без привязки к DOM.
 * При каждом изменении ввода мгновенно отменяет предыдущий активный запрос.
 */
export function createSearchController(
  onStateChange: (state: SearchState) => void,
  options: SearchControllerOptions = {},
): SearchController {
  const debounceMs = options.debounceMs ?? 300;
  const timeoutMs = options.timeoutMs;
  const searchFn = options.searchFn ?? searchCountries;

  let currentAbortController: AbortController | null = null;
  let lastQuery = '';

  const abortCurrentRequest = (): void => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
  };

  const executeSearch = (query: string): void => {
    if (query !== lastQuery || query === '') {
      return;
    }

    abortCurrentRequest();
    const abortController = new AbortController();
    currentAbortController = abortController;

    void (async () => {
      try {
        const countries = await searchFn(query, abortController.signal, timeoutMs);

        if (abortController.signal.aborted) {
          return;
        }

        if (countries.length === 0) {
          onStateChange({ status: 'empty', query });
        } else {
          onStateChange({ status: 'success', query, countries });
        }
      } catch (error) {
        const classified = classifyError(error);

        if (classified.kind === 'abort') {
          return;
        }

        onStateChange({
          status: 'error',
          query,
          message: formatErrorMessage(classified),
        });
      } finally {
        if (currentAbortController === abortController) {
          currentAbortController = null;
        }
      }
    })();
  };

  const debouncedExecute = debounce(executeSearch, debounceMs);

  return {
    search(rawQuery: string): void {
      const query = rawQuery.trim();
      lastQuery = query;

      abortCurrentRequest();

      if (query === '') {
        onStateChange({ status: 'idle' });
        return;
      }

      onStateChange({ status: 'loading', query });
      debouncedExecute(query);
    },

    retry(): void {
      if (lastQuery === '') {
        return;
      }

      abortCurrentRequest();
      onStateChange({ status: 'loading', query: lastQuery });
      executeSearch(lastQuery);
    },

    searchImmediate(rawQuery: string): void {
      const query = rawQuery.trim();
      lastQuery = query;
      abortCurrentRequest();

      if (query === '') {
        onStateChange({ status: 'idle' });
        return;
      }

      onStateChange({ status: 'loading', query });
      executeSearch(query);
    },
  };
}
