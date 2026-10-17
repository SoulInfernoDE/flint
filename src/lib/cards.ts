// Card data from HearthstoneJSON (declared in overlay.json).
//
// The card files are large (all cards about 10 MB, collectible ones about 4 MB). Flint
// downloads one at most once a day, keeps only what it needs and stores that compact
// list in its overLay storage, so later starts need no download.

import { overlay } from '@overlay/sdk';
import {
  compact,
  compactCollectible,
  hsLocale,
  toCollectibleMap,
  toMap,
  type CardDb,
  type Collectible,
  type CollectibleDb,
  type Compact,
  type RawCard,
} from './card-data';

export { hsLocale, tileUrl, type CardDb, type CardInfo, type CollectibleDb } from './card-data';

/** Caches of earlier Flint versions, removed to free storage. */
const OLD_CACHE_KEYS = ['cards-v1', 'cards-v2', 'cards-v3'];
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Cached<T> {
  locale: string;
  fetchedAt: number;
  cards: T[];
}

/** A compact card list from storage, or freshly downloaded and stored. */
async function cachedCards<T>(
  key: string,
  file: string,
  language: string,
  keep: (raw: RawCard[]) => T[],
): Promise<T[]> {
  const locale = hsLocale(language);
  const cached = await overlay.storage.get<Cached<T>>(key).catch(() => null);
  if (cached && cached.locale === locale && Date.now() - cached.fetchedAt < MAX_AGE_MS) {
    return cached.cards;
  }
  try {
    const response = await fetch(`https://api.hearthstonejson.com/v1/latest/${locale}/${file}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const cards = keep((await response.json()) as RawCard[]);
    // A full cache is only a speed-up; ignore the storage limit if it is hit.
    await overlay.storage
      .set(key, { locale, fetchedAt: Date.now(), cards } satisfies Cached<T>)
      .catch((error: unknown) => console.warn('[flint] card cache not stored:', error));
    return cards;
  } catch (error) {
    if (cached) return cached.cards;
    throw error;
  }
}

/** Battlegrounds cards (heroes, minions, shop cards). */
export async function loadCards(language: string): Promise<CardDb> {
  for (const key of OLD_CACHE_KEYS) await overlay.storage.remove(key).catch(() => undefined);
  return toMap(await cachedCards<Compact>('cards-v4', 'cards.json', language, compact));
}

/** Collectible cards, for decks. */
export async function loadCollectible(language: string): Promise<CollectibleDb> {
  return toCollectibleMap(
    await cachedCards<Collectible>(
      'collectible-v1',
      'cards.collectible.json',
      language,
      compactCollectible,
    ),
  );
}
