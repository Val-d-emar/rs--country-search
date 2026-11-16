import type { Country, RawCountry, RawCountryCurrency } from './types.js';

function formatCurrency(currency: RawCountryCurrency): string {
  if (currency.symbol) {
    return `${currency.name} (${currency.code}, ${currency.symbol})`;
  }
  return `${currency.name} (${currency.code})`;
}

export function mapCountryResponse(raw: RawCountry): Country {
  return {
    name: raw.name,
    nativeName: raw.nativeName || raw.name,
    flagUrl: raw.flags?.svg ?? raw.flags?.png ?? '',
    flagAlt: `Flag of ${raw.name}`,
    capital: raw.capital || '—',
    region: raw.region || '—',
    subregion: raw.subregion || '—',
    population: raw.population ?? 0,
    area: raw.area ?? null,
    alpha3Code: raw.alpha3Code,
    languages: (raw.languages ?? []).map((lang) => lang.name),
    currencies: (raw.currencies ?? []).map(formatCurrency),
    borders: [...(raw.borders ?? [])],
  };
}
