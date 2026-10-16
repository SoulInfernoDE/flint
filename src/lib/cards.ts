// Card names and Battlegrounds data from HearthstoneJSON (declared in overlay.json).
//
// The full card file is about 10 MB. Flint downloads it at most once a day, keeps only
// what Battlegrounds needs (heroes, minions, a few shop cards) and stores that compact
// list in its overLay storage, so later starts need no download.

import { overlay } from '@overlay/sdk';

export interface CardInfo {
  name: string;
  type: string;
  tier: number | null;
  races: string[];
}

export type CardDb = ReadonlyMap<string, CardInfo>;

const CACHE_KEY = 'cards-v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** overLay language → HearthstoneJSON locale. */
const LOCALES: Record<string, string> = {
  de: 'deDE',
  en: 'enUS',
  es: 'esES',
  fr: 'frFR',
  it: 'itIT',
  ja: 'jaJP',
  ko: 'koKR',
  pl: 'plPL',
  pt: 'ptBR',
  ru: 'ruRU',
  th: 'thTH',
  zh: 'zhCN',
};

type Compact = [id: string, name: string, type: string, tier: number | null, races: string[]];

interface Cached {
  locale: string;
  fetchedAt: number;
  cards: Compact[];
}

interface RawCard {
  id: string;
  name?: string;
  type?: string;
  techLevel?: number;
  races?: string[];
  race?: string;
  battlegroundsHero?: boolean;
  battlegroundsSkinParentId?: number;
  set?: string;
}

function isBattlegroundsCard(card: RawCard): boolean {
  return (
    card.techLevel !== undefined ||
    card.battlegroundsHero === true ||
    card.battlegroundsSkinParentId !== undefined ||
    card.set === 'BATTLEGROUNDS' ||
    card.id.startsWith('TB_BaconShop')
  );
}

function toMap(cards: Compact[]): CardDb {
  return new Map(cards.map(([id, name, type, tier, races]) => [id, { name, type, tier, races }]));
}

export function hsLocale(language: string): string {
  return LOCALES[language.split('-')[0] ?? 'en'] ?? 'enUS';
}

export async function loadCards(language: string): Promise<CardDb> {
  const locale = hsLocale(language);
  const cached = await overlay.storage.get<Cached>(CACHE_KEY).catch(() => null);
  if (cached && cached.locale === locale && Date.now() - cached.fetchedAt < MAX_AGE_MS) {
    return toMap(cached.cards);
  }
  try {
    const response = await fetch(`https://api.hearthstonejson.com/v1/latest/${locale}/cards.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = (await response.json()) as RawCard[];
    const cards: Compact[] = raw
      .filter(isBattlegroundsCard)
      .map((c) => [
        c.id,
        c.name ?? c.id,
        c.type ?? '',
        c.techLevel ?? null,
        c.races ?? (c.race ? [c.race] : []),
      ]);
    // A full cache is only a speed-up; ignore the storage limit if it is hit.
    await overlay.storage
      .set(CACHE_KEY, { locale, fetchedAt: Date.now(), cards } satisfies Cached)
      .catch((error: unknown) => console.warn('[flint] card cache not stored:', error));
    return toMap(cards);
  } catch (error) {
    if (cached) return toMap(cached.cards);
    throw error;
  }
}

/** Small card art strip (also used for heroes). */
export function tileUrl(cardId: string): string {
  return `https://art.hearthstonejson.com/v1/tiles/${encodeURIComponent(cardId)}.png`;
}
