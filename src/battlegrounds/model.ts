// Battlegrounds state derived from the entity mirror the overLay SDK keeps.
//
// Where the data lives (checked against real games):
// - the user's player entity: RESOURCES / RESOURCES_USED (gold), PLAYER_TECH_LEVEL
//   (tavern tier), NEXT_OPPONENT_PLAYER_ID, BACON_CURRENT_COMBAT_PLAYER_ID;
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
  gold: number;
  maxGold: number;
  nextOpponentPlayerId: number | null;
  combatOpponentPlayerId: number | null;
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
  const combatOpponent = num(player, 'BACON_CURRENT_COMBAT_PLAYER_ID') || null;

  // One hero per lobby player: the newest entity that has a leaderboard place.
  const byPlayer = new Map<number, Entity>();
  for (const entity of entities.values()) {
    if (entity.tags.CARDTYPE !== 'HERO' || !entity.tags.PLAYER_LEADERBOARD_PLACE) continue;
    if (entity.tags.ZONE === 'REMOVEDFROMGAME') continue;
    const id = num(entity, 'PLAYER_ID');
    const known = byPlayer.get(id);
    if (!known || entity.entity_id > known.entity_id) byPlayer.set(id, entity);
  }
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
        tier: num(hero, 'PLAYER_TECH_LEVEL'),
        triples: num(hero, 'PLAYER_TRIPLES'),
        friendly: id === playerId,
        nextOpponent: id === nextOpponent,
        inCombat: id === combatOpponent,
        dead: health <= 0,
      };
    })
    .sort((a, b) => a.place - b.place);

  const other = otherPlayerEntityId == null ? undefined : entities.get(otherPlayerEntityId);
  return {
    playerId,
    tier: num(player, 'PLAYER_TECH_LEVEL'),
    gold: Math.max(
      0,
      num(player, 'RESOURCES') - num(player, 'RESOURCES_USED') + num(player, 'TEMP_RESOURCES'),
    ),
    maxGold: num(player, 'RESOURCES'),
    nextOpponentPlayerId: nextOpponent,
    combatOpponentPlayerId: combatOpponent,
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
