import { searchCountries } from '../api/countries.js';
import { debounce } from '../utils/debounce.js';
import { classifyError } from './classifyError.js';
function formatErrorMessage(error) {
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
export function createSearchController(onStateChange, options = {}) {
    const debounceMs = options.debounceMs ?? 300;
    const timeoutMs = options.timeoutMs;
    const searchFn = options.searchFn ?? searchCountries;
    let currentAbortController = null;
    let lastQuery = '';
    const abortCurrentRequest = () => {
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
        }
    };
    const executeSearch = (query) => {
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
                }
                else {
                    onStateChange({ status: 'success', query, countries });
                }
            }
            catch (error) {
                const classified = classifyError(error);
                if (classified.kind === 'abort') {
                    return;
                }
                onStateChange({
                    status: 'error',
                    query,
                    message: formatErrorMessage(classified),
                });
            }
            finally {
                if (currentAbortController === abortController) {
                    currentAbortController = null;
                }
            }
        })();
    };
    const debouncedExecute = debounce(executeSearch, debounceMs);
    return {
        search(rawQuery) {
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
        retry() {
            if (lastQuery === '') {
                return;
            }
            abortCurrentRequest();
            onStateChange({ status: 'loading', query: lastQuery });
            executeSearch(lastQuery);
        },
        searchImmediate(rawQuery) {
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
