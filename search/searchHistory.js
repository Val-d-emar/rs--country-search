const DEFAULT_STORAGE_KEY = 'country-search-history';
const DEFAULT_MAX_ITEMS = 8;
function getDefaultStorage() {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    }
    catch {
        return null;
    }
}
/**
 * Управляет историей последних поисковых запросов в localStorage.
 */
export function createSearchHistory(storage = getDefaultStorage(), storageKey = DEFAULT_STORAGE_KEY, maxItems = DEFAULT_MAX_ITEMS) {
    const read = () => {
        if (!storage) {
            return [];
        }
        try {
            const raw = storage.getItem(storageKey);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.filter((item) => typeof item === 'string');
        }
        catch {
            return [];
        }
    };
    const write = (items) => {
        if (!storage) {
            return;
        }
        try {
            storage.setItem(storageKey, JSON.stringify(items));
        }
        catch {
            // Игнорируем ошибки
        }
    };
    return {
        getAll() {
            return read();
        },
        add(rawQuery) {
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
