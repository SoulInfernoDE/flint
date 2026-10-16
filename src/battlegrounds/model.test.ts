import { describe, expect, it } from 'vitest';
import { LastBoards, deriveState, isBattlegrounds, type Entities } from './model';

type Tags = Record<string, string>;

function entities(list: [number, string | null, Tags][]): Entities {
  return new Map(list.map(([id, cardId, tags]) => [id, { entity_id: id, card_id: cardId, tags }]));
}

// A small lobby modelled on a real game: the user is player 2 (entity 5), the other
// side is player 10 (entity 6); entity 160 is a hero that was offered but not picked.
const lobby = entities([
  [
    5,
    null,
    {
      CARDTYPE: 'PLAYER',
      PLAYER_ID: '2',
      RESOURCES: '9',
      RESOURCES_USED: '3',
      PLAYER_TECH_LEVEL: '3',
      NEXT_OPPONENT_PLAYER_ID: '8',
      BACON_CURRENT_COMBAT_PLAYER_ID: '0',
    },
  ],
  [6, null, { CARDTYPE: 'PLAYER', PLAYER_ID: '10' }],
  [
    99,
    'BG23_HERO_305',
    {
      CARDTYPE: 'HERO',
      ZONE: 'PLAY',
      PLAYER_ID: '2',
      PLAYER_LEADERBOARD_PLACE: '6',
      HEALTH: '30',
      DAMAGE: '4',
      ARMOR: '2',
      PLAYER_TECH_LEVEL: '3',
    },
  ],
  [
    125,
    'TB_BaconShop_HERO_21',
    {
      CARDTYPE: 'HERO',
      ZONE: 'SETASIDE',
      PLAYER_ID: '8',
      PLAYER_LEADERBOARD_PLACE: '1',
      HEALTH: '30',
      ARMOR: '12',
      PLAYER_TECH_LEVEL: '3',
    },
  ],
  [
    170,
    'BG22_HERO_002',
    {
      CARDTYPE: 'HERO',
      ZONE: 'SETASIDE',
      PLAYER_ID: '7',
      PLAYER_LEADERBOARD_PLACE: '8',
      HEALTH: '30',
      DAMAGE: '30',
      PLAYER_TECH_LEVEL: '2',
      PLAYER_TRIPLES: '1',
    },
  ],
  [
    160,
    'BG20_HERO_100',
    { CARDTYPE: 'HERO', ZONE: 'REMOVEDFROMGAME', PLAYER_ID: '2', PLAYER_LEADERBOARD_PLACE: '1' },
  ],
  [
    2709,
    'BG26_146',
    {
      CARDTYPE: 'MINION',
      ZONE: 'PLAY',
      CONTROLLER: '2',
      ZONE_POSITION: '2',
      ATK: '3',
      HEALTH: '7',
      TECH_LEVEL: '1',
      CARDRACE: 'MECHANICAL',
    },
  ],
  [
    2712,
    'BG26_146',
    {
      CARDTYPE: 'MINION',
      ZONE: 'PLAY',
      CONTROLLER: '2',
      ZONE_POSITION: '1',
      ATK: '6',
      HEALTH: '14',
      TECH_LEVEL: '1',
      PREMIUM: '1',
    },
  ],
  [
    3273,
    'BG36_099',
    {
      CARDTYPE: 'MINION',
      ZONE: 'PLAY',
      CONTROLLER: '10',
      ZONE_POSITION: '1',
      ATK: '3',
      HEALTH: '4',
      TECH_LEVEL: '2',
    },
  ],
  [
    3300,
    'BG36_100',
    { CARDTYPE: 'MINION', ZONE: 'GRAVEYARD', CONTROLLER: '2', ATK: '1', HEALTH: '1' },
  ],
]);

describe('battlegrounds model', () => {
  it('recognizes Battlegrounds game types', () => {
    expect(isBattlegrounds('GT_BATTLEGROUNDS')).toBe(true);
    expect(isBattlegrounds('GT_BATTLEGROUNDS_FRIENDLY')).toBe(true);
    expect(isBattlegrounds('GT_RANKED')).toBe(false);
    expect(isBattlegrounds(null)).toBe(false);
  });

  it('derives gold, tier and the leaderboard', () => {
    const state = deriveState(lobby, 5, 6)!;
    expect(state.gold).toBe(6);
    expect(state.maxGold).toBe(9);
    expect(state.tier).toBe(3);
    expect(state.heroes.map((h) => h.playerId)).toEqual([8, 2, 7]);
    const me = state.heroes.find((h) => h.friendly)!;
    expect(me).toMatchObject({ cardId: 'BG23_HERO_305', health: 26, armor: 2, place: 6 });
    expect(state.heroes[0]).toMatchObject({ nextOpponent: true, inCombat: false });
    expect(state.heroes[2]).toMatchObject({ dead: true, triples: 1 });
  });

  it('lists boards in position order', () => {
    const state = deriveState(lobby, 5, 6)!;
    expect(state.board.map((m) => m.entityId)).toEqual([2712, 2709]);
    expect(state.board[0]).toMatchObject({ attack: 6, health: 14, golden: true });
    expect(state.otherBoard.map((m) => m.cardId)).toEqual(['BG36_099']);
  });

  it('returns null without the player entity', () => {
    expect(deriveState(lobby, null, 6)).toBeNull();
    expect(deriveState(lobby, 999, 6)).toBeNull();
  });

  it('remembers the largest board seen in each combat', () => {
    const boards = new LastBoards();
    const base = deriveState(lobby, 5, 6)!;
    const minion = base.otherBoard[0]!;
    boards.update({ ...base, combatOpponentPlayerId: 8, otherBoard: [minion] });
    boards.update({ ...base, combatOpponentPlayerId: 8, otherBoard: [minion, minion] });
    boards.update({ ...base, combatOpponentPlayerId: 8, otherBoard: [] });
    boards.update({ ...base, combatOpponentPlayerId: null, otherBoard: [] });
    expect(boards.get(8)).toHaveLength(2);
    // A new combat against the same opponent starts fresh.
    boards.update({ ...base, combatOpponentPlayerId: 8, otherBoard: [minion] });
    expect(boards.get(8)).toHaveLength(1);
  });
});
