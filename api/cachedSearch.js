import { searchCountries } from './countries.js';
/**
 * Оборачивает общий промис так, чтобы конкретный вызывающий мог отменить
 * ожидание по своему `signal`, не прерывая общий сетевой запрос для остальных.
 */
function raceWithAbort(promise, signal) {
    if (!signal) {
        return promise;
    }
    if (signal.aborted) {
        return Promise.reject(signal.reason);
    }
    return new Promise((resolve, reject) => {
        const onAbort = () => {
            reject(signal.reason);
        };
        signal.addEventListener('abort', onAbort, { once: true });
        promise.then((value) => {
            signal.removeEventListener('abort', onAbort);
            resolve(value);
        }, (error) => {
            signal.removeEventListener('abort', onAbort);
            reject(error);
        });
    });
}
/**
 * Создаёт обёртку над поиском стран с кэшем по строке запроса
 * и дедупликацией одновременных одинаковых запросов («в полёте»).
 */
export function createCachedCountrySearch(baseSearch = searchCountries) {
    const cache = new Map();
    const inFlight = new Map();
    return async (query, signal, timeoutMs) => {
        if (signal?.aborted) {
            return Promise.reject(signal.reason);
        }
        const key = query.trim().toLowerCase();
        const cached = cache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        let sharedPromise = inFlight.get(key);
        if (!sharedPromise) {
            sharedPromise = baseSearch(query.trim(), undefined, timeoutMs)
                .then((countries) => {
                cache.set(key, countries);
                return countries;
            })
                .finally(() => {
                inFlight.delete(key);
            });
            inFlight.set(key, sharedPromise);
        }
        return raceWithAbort(sharedPromise, signal);
    };
}
