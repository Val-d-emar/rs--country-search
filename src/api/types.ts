export interface RawCountryFlags {
  png?: string;
  svg?: string;
}

export interface RawCountryLanguage {
  name: string;
  iso639_1?: string;
  iso639_2?: string;
  nativeName?: string;
}

export interface RawCountryCurrency {
  code: string;
  name: string;
  symbol?: string;
}

export interface RawCountry {
  name: string;
  nativeName?: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  alpha3Code: string;
  flag?: string;
  flags?: RawCountryFlags;
  borders?: string[];
  languages?: RawCountryLanguage[];
  currencies?: RawCountryCurrency[];
}

export interface Country {
  name: string;
  nativeName: string;
  flagUrl: string;
  flagAlt: string;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  area: number | null;
  alpha3Code: string;
  languages: string[];
  currencies: string[];
  borders: string[];
}
