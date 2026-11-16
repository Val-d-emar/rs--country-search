import { describe, expect, it } from 'vitest';
import { createSearchHistory, type StorageLike } from '../../src/search/searchHistory.js';

function createMemoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('createSearchHistory', () => {
  it('добавляет запросы в начало списка и убирает дубликаты без учёта регистра', () => {
    const history = createSearchHistory(createMemoryStorage());

    history.add('Spain');
    history.add('France');
    const items = history.add('spain');

    expect(items).toEqual(['spain', 'France']);
  });

  it('ограничивает размер истории до maxItems', () => {
    const history = createSearchHistory(createMemoryStorage(), 'key', 3);

    history.add('one');
    history.add('two');
    history.add('three');
    const items = history.add('four');

    expect(items).toEqual(['four', 'three', 'two']);
  });

  it('безопасно обрабатывает повреждённый JSON в хранилище', () => {
    const brokenStorage: StorageLike = {
      getItem: () => '{broken json',
      setItem: () => {},
    };
    const history = createSearchHistory(brokenStorage);

    expect(history.getAll()).toEqual([]);
  });
});
