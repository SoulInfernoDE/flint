// Card names and Battlegrounds data from HearthstoneJSON (declared in overlay.json).
//
// The full card file is about 10 MB. Flint downloads it at most once a day, keeps only
// what Battlegrounds needs (heroes, minions, a few shop cards) and stores that compact
// list in its overLay storage, so later starts need no download.

import { overlay } from '@overlay/sdk';
import { compact, hsLocale, toMap, type CardDb, type Compact, type RawCard } from './card-data';

export { hsLocale, tileUrl, type CardDb, type CardInfo } from './card-data';

const CACHE_KEY = 'cards-v2';
/** Caches of earlier Flint versions, removed to free storage. */
const OLD_CACHE_KEYS = ['cards-v1'];
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Cached {
  locale: string;
  fetchedAt: number;
  cards: Compact[];
}

export async function loadCards(language: string): Promise<CardDb> {
  for (const key of OLD_CACHE_KEYS) await overlay.storage.remove(key).catch(() => undefined);
  const locale = hsLocale(language);
  const cached = await overlay.storage.get<Cached>(CACHE_KEY).catch(() => null);
  if (cached && cached.locale === locale && Date.now() - cached.fetchedAt < MAX_AGE_MS) {
    return toMap(cached.cards);
  }
  try {
    const response = await fetch(`https://api.hearthstonejson.com/v1/latest/${locale}/cards.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const cards = compact((await response.json()) as RawCard[]);
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
