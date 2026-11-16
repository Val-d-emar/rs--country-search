const DEFAULT_STORAGE_KEY = 'country-search-history';
const DEFAULT_MAX_ITEMS = 8;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface SearchHistory {
  getAll: () => string[];
  add: (query: string) => string[];
}

function getDefaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Управляет историей последних поисковых запросов в localStorage.
 */
export function createSearchHistory(
  storage: StorageLike | null = getDefaultStorage(),
  storageKey = DEFAULT_STORAGE_KEY,
  maxItems = DEFAULT_MAX_ITEMS,
): SearchHistory {
  const read = (): string[] => {
    if (!storage) {
      return [];
    }

    try {
      const raw = storage.getItem(storageKey);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      return [];
    }
  };

  const write = (items: string[]): void => {
    if (!storage) {
      return;
    }

    try {
      storage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Игнорируем ошибки
    }
  };

  return {
    getAll(): string[] {
      return read();
    },

    add(rawQuery: string): string[] {
      const query = rawQuery.trim();
      if (!query) {
        return read();
      }

      const lower = query.toLowerCase();
      const filtered = read().filter((item) => item.toLowerCase() !== lower);
      const updated = [query, ...filtered].slice(0, maxItems);

      write(updated);
      return updated;
    },
  };
}
