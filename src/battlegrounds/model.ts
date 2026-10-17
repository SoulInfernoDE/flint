// Battlegrounds state derived from the entity mirror the overLay SDK keeps.
//
// Where the data lives (checked against real games):
// - the user's player entity: RESOURCES / RESOURCES_USED (gold), PLAYER_TECH_LEVEL
//   (tavern tier), BACON_MAX_PLAYER_TECH_LEVEL, NEXT_OPPONENT_PLAYER_ID; its
//   BACON_CURRENT_COMBAT_PLAYER_ID is the
//   user's own id during combat;
// - the other side's player entity: BACON_CURRENT_COMBAT_PLAYER_ID is the opponent in
//   the current combat (0 outside combat); the log names this entity after the opponent;
// - one hero entity per lobby player with PLAYER_LEADERBOARD_PLACE, PLAYER_ID, HEALTH,
//   DAMAGE, ARMOR, PLAYER_TECH_LEVEL and PLAYER_TRIPLES (heroes that were offered but not
//   picked are in REMOVEDFROMGAME and ignored);
// - minions in PLAY, owned (CONTROLLER) by the user or by the other side, which is both
//   the tavern during recruitment and the opponent during combat.

import type { Hearthstone } from '@overlay/sdk';

type Entity = Readonly<Hearthstone.Entity>;
export type Entities = ReadonlyMap<number, Entity>;

export interface BgHero {
  playerId: number;
  entityId: number;
  cardId: string | null;
  place: number;
  health: number;
  armor: number;
  tier: number;
  triples: number;
  friendly: boolean;
  nextOpponent: boolean;
  inCombat: boolean;
  dead: boolean;
}

export interface BgMinion {
  entityId: number;
  cardId: string | null;
  attack: number;
  health: number;
  tier: number;
  golden: boolean;
  race: string | null;
}

export interface BgState {
  playerId: number;
  tier: number;
  /** Highest tavern tier of this game. */
  maxTier: number;
  gold: number;
  maxGold: number;
  nextOpponentPlayerId: number | null;
  combatOpponentPlayerId: number | null;
  /** False during the hero choice: players who picked already have a leaderboard place,
   * the others not yet, so the lobby is incomplete until everyone has picked (or, in a
   * smaller private lobby, until the first turn). */
  heroPicked: boolean;
  heroes: BgHero[];
  board: BgMinion[];
  /** The other side's minions: the tavern while recruiting, the opponent in combat. */
  otherBoard: BgMinion[];
}

export function isBattlegrounds(gameType: string | null | undefined): boolean {
  return !!gameType && gameType.startsWith('GT_BATTLEGROUNDS');
}

function num(entity: Entity | undefined, tag: string): number {
  const value = Number(entity?.tags[tag] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function minion(entity: Entity): BgMinion {
  return {
    entityId: entity.entity_id,
    cardId: entity.card_id,
    attack: num(entity, 'ATK'),
    health: num(entity, 'HEALTH'),
    tier: num(entity, 'TECH_LEVEL'),
    golden: num(entity, 'PREMIUM') === 1,
    race: entity.tags.CARDRACE ?? null,
  };
}

function boardOf(entities: Entities, controller: number): BgMinion[] {
  return [...entities.values()]
    .filter(
      (e) =>
        e.tags.CARDTYPE === 'MINION' &&
        e.tags.ZONE === 'PLAY' &&
        num(e, 'CONTROLLER') === controller,
    )
    .sort((a, b) => num(a, 'ZONE_POSITION') - num(b, 'ZONE_POSITION'))
    .map(minion);
}

/** Players in a Battlegrounds lobby. */
const LOBBY_SIZE = 8;

function gameTurn(entities: Entities): number {
  for (const entity of entities.values()) {
    if (entity.tags.CARDTYPE === 'GAME') return num(entity, 'TURN');
  }
  return 0;
}

/** The state for the user's player entity, or null if it is not known yet. */
export function deriveState(
  entities: Entities,
  playerEntityId: number | null | undefined,
  otherPlayerEntityId: number | null | undefined,
): BgState | null {
  const player = playerEntityId == null ? undefined : entities.get(playerEntityId);
  if (!player) return null;
  const playerId = num(player, 'PLAYER_ID');
  const nextOpponent = num(player, 'NEXT_OPPONENT_PLAYER_ID') || null;
  const other = otherPlayerEntityId == null ? undefined : entities.get(otherPlayerEntityId);
  const combatId = num(other, 'BACON_CURRENT_COMBAT_PLAYER_ID');
  const combatOpponent = combatId && combatId !== playerId ? combatId : null;

  // One hero per lobby player: the newest entity that has a leaderboard place.
  const byPlayer = new Map<number, Entity>();
  for (const entity of entities.values()) {
    if (entity.tags.CARDTYPE !== 'HERO' || !entity.tags.PLAYER_LEADERBOARD_PLACE) continue;
    if (entity.tags.ZONE === 'REMOVEDFROMGAME') continue;
    const id = num(entity, 'PLAYER_ID');
    const known = byPlayer.get(id);
    if (!known || entity.entity_id > known.entity_id) byPlayer.set(id, entity);
  }
  // The user's own hero is the player's HERO_ENTITY: when the user is knocked out, the
  // game copies the hero (for their ghost), and the copy keeps an outdated place.
  const ownHero = entities.get(num(player, 'HERO_ENTITY'));
  if (ownHero?.tags.PLAYER_LEADERBOARD_PLACE) byPlayer.set(playerId, ownHero);
  const heroes = [...byPlayer.entries()]
    .map(([id, hero]): BgHero => {
      const health = num(hero, 'HEALTH') - num(hero, 'DAMAGE');
      return {
        playerId: id,
        entityId: hero.entity_id,
        cardId: hero.card_id,
        place: num(hero, 'PLAYER_LEADERBOARD_PLACE'),
        health,
        armor: num(hero, 'ARMOR'),
        // Set only after the first upgrade or later; everyone starts on tier 1.
        tier: num(hero, 'PLAYER_TECH_LEVEL') || 1,
        triples: num(hero, 'PLAYER_TRIPLES'),
        friendly: id === playerId,
        nextOpponent: id === nextOpponent,
        inCombat: id === combatOpponent,
        dead: health <= 0,
      };
    })
    .sort((a, b) => a.place - b.place);

  return {
    playerId,
    tier: num(player, 'PLAYER_TECH_LEVEL') || 1,
    maxTier: num(player, 'BACON_MAX_PLAYER_TECH_LEVEL') || 6,
    gold: Math.max(
      0,
      num(player, 'RESOURCES') - num(player, 'RESOURCES_USED') + num(player, 'TEMP_RESOURCES'),
    ),
    maxGold: num(player, 'RESOURCES'),
    nextOpponentPlayerId: nextOpponent,
    combatOpponentPlayerId: combatOpponent,
    heroPicked:
      heroes.some((hero) => hero.friendly) &&
      (heroes.length >= LOBBY_SIZE || gameTurn(entities) >= 1),
    heroes,
    board: boardOf(entities, playerId),
    otherBoard: other ? boardOf(entities, num(other, 'PLAYER_ID')) : [],
  };
}

/**
 * Remembers each opponent's board as it was when combat started: the largest board seen
 * during that combat, taken before minions die (stats are the minions' full values).
 */
export class LastBoards {
  private boards = new Map<number, BgMinion[]>();
  private currentCombat: number | null = null;

  update(state: BgState): void {
    const opponent = state.combatOpponentPlayerId;
    if (opponent !== this.currentCombat) {
      this.currentCombat = opponent;
      if (opponent !== null) this.boards.delete(opponent);
    }
    if (opponent === null) return;
    const known = this.boards.get(opponent);
    if (!known || state.otherBoard.length > known.length) {
      this.boards.set(opponent, state.otherBoard);
    }
  }

  get(playerId: number): BgMinion[] | undefined {
    return this.boards.get(playerId);
  }

  clear(): void {
    this.boards.clear();
    this.currentCombat = null;
  }
}
