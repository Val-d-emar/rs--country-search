import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../../src/api/mapper.js';
import type { RawCountry } from '../../src/api/types.js';

// Реальный объект из ответа https://countries.dev/name/spain
const spainRaw: RawCountry = {
  name: 'Spain',
  nativeName: 'España',
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  alpha3Code: 'ESP',
  flag: '🇪🇸',
  flags: {
    png: 'https://flagcdn.com/w320/es.png',
    svg: 'https://flagcdn.com/es.svg',
  },
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  languages: [
    {
      name: 'Spanish',
      iso639_1: 'es',
      iso639_2: 'spa',
      nativeName: 'Español',
    },
  ],
  currencies: [
    {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
    },
  ],
};

describe('mapCountryResponse', () => {
  it('корректно преобразует полный ответ API в модель страны', () => {
    const result = mapCountryResponse(spainRaw);

    expect(result).toEqual({
      name: 'Spain',
      nativeName: 'España',
      flagUrl: 'https://flagcdn.com/es.svg',
      flagAlt: 'Flag of Spain',
      capital: 'Madrid',
      region: 'Europe',
      subregion: 'Southern Europe',
      population: 47351567,
      area: 505992,
      alpha3Code: 'ESP',
      languages: ['Spanish'],
      currencies: ['Euro (EUR, €)'],
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
    });
  });

  it('безопасно обрабатывает отсутствующие необязательные поля', () => {
    const minimalRaw: RawCountry = {
      name: 'Antarctica',
      region: 'Polar',
      population: 1000,
      alpha3Code: 'ATA',
      flags: {
        png: 'https://flagcdn.com/w320/aq.png',
      },
    };

    const result = mapCountryResponse(minimalRaw);

    expect(result).toEqual({
      name: 'Antarctica',
      nativeName: 'Antarctica',
      flagUrl: 'https://flagcdn.com/w320/aq.png',
      flagAlt: 'Flag of Antarctica',
      capital: '—',
      region: 'Polar',
      subregion: '—',
      population: 1000,
      area: null,
      alpha3Code: 'ATA',
      languages: [],
      currencies: [],
      borders: [],
    });
  });

  it('форматирует валюту без символа, если symbol отсутствует', () => {
    const rawWithoutSymbol: RawCountry = {
      ...spainRaw,
      currencies: [{ code: 'XXX', name: 'Test Currency' }],
    };

    const result = mapCountryResponse(rawWithoutSymbol);

    expect(result.currencies).toEqual(['Test Currency (XXX)']);
  });

  it('не мутирует исходный объект API', () => {
    const rawCopy: RawCountry = structuredClone(spainRaw);
    const result = mapCountryResponse(rawCopy);

    result.borders.push('TEST');
    result.languages.push('TestLang');

    expect(rawCopy.borders).toEqual(['AND', 'FRA', 'GIB', 'PRT', 'MAR']);
    expect(rawCopy.languages).toHaveLength(1);
  });
});
