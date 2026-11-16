import { searchCountries } from './countries.js';
/**
 * Создаёт обёртку над поиском стран с кэшем по строке запроса
 * и дедупликацией одновременных одинаковых запросов («в полёте»).
 */
export function createCachedCountrySearch(baseSearch = searchCountries) {
    const cache = new Map();
    const inFlight = new Map();
    return (query, signal, timeoutMs) => {
        if (signal?.aborted) {
            return Promise.reject(signal.reason);
        }
        const key = query.trim().toLowerCase();
        const cached = cache.get(key);
        if (cached !== undefined) {
            return Promise.resolve(cached);
        }
        let entry = inFlight.get(key);
        if (!entry) {
            const controller = new AbortController();
            const currentEntry = {
                controller,
                subscribers: 0,
                promise: Promise.resolve([]),
            };
            currentEntry.promise = baseSearch(query.trim(), controller.signal, timeoutMs)
                .then((countries) => {
                cache.set(key, countries);
                return countries;
            })
                .finally(() => {
                if (inFlight.get(key) === currentEntry) {
                    inFlight.delete(key);
                }
            });
            inFlight.set(key, currentEntry);
            entry = currentEntry;
        }
        const activeEntry = entry;
        activeEntry.subscribers += 1;
        if (!signal) {
            return activeEntry.promise.finally(() => {
                activeEntry.subscribers -= 1;
            });
        }
        return new Promise((resolve, reject) => {
            const onAbort = () => {
                activeEntry.subscribers -= 1;
                if (activeEntry.subscribers === 0) {
                    if (inFlight.get(key) === activeEntry) {
                        inFlight.delete(key);
                    }
                    activeEntry.controller.abort(signal.reason);
                }
                reject(signal.reason);
            };
            signal.addEventListener('abort', onAbort, { once: true });
            activeEntry.promise.then((value) => {
                signal.removeEventListener('abort', onAbort);
                activeEntry.subscribers -= 1;
                resolve(value);
            }, (error) => {
                signal.removeEventListener('abort', onAbort);
                activeEntry.subscribers -= 1;
                reject(error);
            });
        });
    };
}
