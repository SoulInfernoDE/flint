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
}

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
];

export interface RawCard {
  id: string;
  dbfId?: number;
  name?: string;
  attack?: number;
  health?: number;
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
  for (const [id, name, type, tier, races, attack, health, flags] of cards) {
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
      // Enchantments are never shown; leaving them out keeps the stored list small.
      .filter((c) => isBattlegroundsCard(c) && c.type !== 'ENCHANTMENT')
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
      ])
  );
}

export function hsLocale(language: string): string {
  return LOCALES[language.split('-')[0] ?? 'en'] ?? 'enUS';
}

/** Small card art strip (also used for heroes). */
export function tileUrl(cardId: string): string {
  return `https://art.hearthstonejson.com/v1/tiles/${encodeURIComponent(cardId)}.png`;
}
