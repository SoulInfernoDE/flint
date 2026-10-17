// Battlegrounds card data from HearthstoneJSON, without the SDK (also used by tests).

export interface CardInfo {
  /** The card's own id; golden versions of pool minions share their normal card's info. */
  id: string;
  name: string;
  type: string;
  tier: number | null;
  races: string[];
  attack: number | null;
  health: number | null;
  /** A minion of the Battlegrounds pool (golden versions count as their normal one). */
  pool: boolean;
  /** Only in the Duos pool. */
  duosOnly: boolean;
  /** Keywords of pool minions that the minion list can filter by (see MECHANICS). */
  mechanics: string[];
}

/** Keywords of pool minions offered as filters, in display order. */
export const MECHANICS = [
  'BATTLECRY',
  'DEATHRATTLE',
  'BACON_RALLY',
  'START_OF_COMBAT',
  'END_OF_TURN_TRIGGER',
  'AVENGE',
  'BACON_SPELLCRAFT_ID',
  'DIVINE_SHIELD',
  'TAUNT',
  'REBORN',
  'WINDFURY',
  'VENOMOUS',
  'MAGNETIC',
];

export type CardDb = ReadonlyMap<string, CardInfo>;

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

const POOL = 1;
const DUOS_ONLY = 2;

export type Compact = [
  id: string,
  name: string,
  type: string,
  tier: number | null,
  races: string[],
  attack: number | null,
  health: number | null,
  flags: number,
  /** Id of the golden version of a pool minion. */
  golden: string | null,
  mechanics: string[],
];

export interface RawCard {
  id: string;
  dbfId?: number;
  name?: string;
  cost?: number;
  rarity?: string;
  cardClass?: string;
  attack?: number;
  health?: number;
  mechanics?: string[];
  isBattlegroundsPoolMinion?: boolean;
  isBattlegroundsDuosExclusive?: boolean;
  battlegroundsPremiumDbfId?: number;
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

export function toMap(cards: Compact[]): CardDb {
  const map = new Map<string, CardInfo>();
  for (const [id, name, type, tier, races, attack, health, flags, , mechanics] of cards) {
    map.set(id, {
      id,
      name,
      type,
      tier,
      races,
      attack,
      health,
      pool: (flags & POOL) !== 0,
      duosOnly: (flags & DUOS_ONLY) !== 0,
      mechanics: mechanics ?? [],
    });
  }
  // Golden minions count as their normal one (same name and tribes, doubled stats).
  for (const [id, , , , , , , , golden] of cards) {
    const info = map.get(id);
    if (golden && info) map.set(golden, info);
  }
  return map;
}

/** Keeps what Battlegrounds needs of the full card list (exported for tests). */
export function compact(raw: RawCard[]): Compact[] {
  const byDbf = new Map(raw.filter((c) => c.dbfId !== undefined).map((c) => [c.dbfId, c.id]));
  return (
    raw
      // Flint shows only minions and heroes; the rest would only fill the storage.
      .filter((c) => isBattlegroundsCard(c) && (c.type === 'MINION' || c.type === 'HERO'))
      .map((c) => [
        c.id,
        c.name ?? c.id,
        c.type ?? '',
        c.techLevel ?? null,
        c.races ?? (c.race ? [c.race] : []),
        c.attack ?? null,
        c.health ?? null,
        (c.isBattlegroundsPoolMinion ? POOL : 0) | (c.isBattlegroundsDuosExclusive ? DUOS_ONLY : 0),
        c.isBattlegroundsPoolMinion ? (byDbf.get(c.battlegroundsPremiumDbfId) ?? null) : null,
        c.isBattlegroundsPoolMinion ? (c.mechanics ?? []).filter((m) => MECHANICS.includes(m)) : [],
      ])
  );
}

export function hsLocale(language: string): string {
  return LOCALES[language.split('-')[0] ?? 'en'] ?? 'enUS';
}

/**
 * A collectible card as stored: dbf id, card id, name, mana cost, rarity, type, and for
 * secrets only their class and card set (kept small, as the list has thousands of cards).
 */
export type Collectible = [
  dbfId: number,
  id: string,
  name: string,
  cost: number,
  rarity: string,
  type: string,
  secret?: [cardClass: string, set: string],
];

export interface CollectibleInfo {
  dbfId: number;
  id: string;
  name: string;
  cost: number;
  rarity: string;
  type: string;
  /** Class and card set of a secret; null for other cards. */
  secret: { cardClass: string; set: string } | null;
}

export interface CollectibleDb {
  byDbf: ReadonlyMap<number, CollectibleInfo>;
  byId: ReadonlyMap<string, CollectibleInfo>;
}

/** Keeps what the deck tracker needs of the collectible card list. */
export function compactCollectible(raw: RawCard[]): Collectible[] {
  return (
    raw
      // Hero skins are collectible but never part of a deck.
      .filter((c) => c.dbfId !== undefined && !(c.type === 'HERO' && c.set === 'HERO_SKINS'))
      .map((c): Collectible => {
        const card: Collectible = [
          c.dbfId!,
          c.id,
          c.name ?? c.id,
          c.cost ?? 0,
          c.rarity ?? '',
          c.type ?? '',
        ];
        if (c.mechanics?.includes('SECRET')) card.push([c.cardClass ?? '', c.set ?? '']);
        return card;
      })
  );
}

export function toCollectibleMap(cards: Collectible[]): CollectibleDb {
  const list = cards.map(([dbfId, id, name, cost, rarity, type, secret]) => ({
    dbfId,
    id,
    name,
    cost,
    rarity,
    type,
    secret: secret ? { cardClass: secret[0], set: secret[1] } : null,
  }));
  return {
    byDbf: new Map(list.map((c) => [c.dbfId, c])),
    byId: new Map(list.map((c) => [c.id, c])),
  };
}

/** Small card art strip (also used for heroes). */
export function tileUrl(cardId: string): string {
  return `https://art.hearthstonejson.com/v1/tiles/${encodeURIComponent(cardId)}.png`;
}
