import { readFileSync } from 'node:fs';
import type { Hearthstone } from '@overlay/sdk';
import { describe, expect, it } from 'vitest';
import {
  SESSION_GAP_MS,
  addGame,
  recordGame,
  sessionGames,
  summarize,
  type GameRecord,
  type History,
} from './history';
import type { Entities } from './model';

function entities(list: [number, string | null, Record<string, string>][]): Entities {
  return new Map(list.map(([id, cardId, tags]) => [id, { entity_id: id, card_id: cardId, tags }]));
}

const ended = entities([
  [1, null, { CARDTYPE: 'GAME', GAME_SEED: '42' }],
  [5, null, { CARDTYPE: 'PLAYER', HERO_ENTITY: '99', PLAYER_TECH_LEVEL: '4' }],
  [99, 'BG23_HERO_305', { CARDTYPE: 'HERO', PLAYER_LEADERBOARD_PLACE: '3' }],
]);

function game(seed: string, endedAt: number, place: number, duos = false): GameRecord {
  return { seed, endedAt, heroCardId: null, place, tier: 1, duos, tribes: [] };
}

const HOUR = 60 * 60 * 1000;

describe('game history', () => {
  it('records the final placement, hero and tier', () => {
    const extra = { endedAt: 1000, duos: false, tribes: ['BEAST'] };
    expect(recordGame(ended, 5, 1, extra)).toEqual({
      seed: '42',
      endedAt: 1000,
      heroCardId: 'BG23_HERO_305',
      place: 3,
      tier: 4,
      duos: false,
      tribes: ['BEAST'],
    });
    // Without a placement (e.g. left during the hero choice) nothing is recorded.
    const early = new Map(ended);
    early.set(99, { entity_id: 99, card_id: 'X', tags: { CARDTYPE: 'HERO' } });
    expect(recordGame(early, 5, 1, extra)).toBeNull();
  });

  it('stores each game once', () => {
    let history: History = { games: [], sessionStart: null };
    history = addGame(history, game('a', 1, 5));
    history = addGame(history, game('a', 2, 5));
    expect(history.games).toHaveLength(1);
  });

  it('ends a session after a long break or a manual start', () => {
    const now = 100 * HOUR;
    const history: History = {
      games: [
        game('old', now - 10 * HOUR, 1),
        game('a', now - 3 * HOUR, 5),
        game('b', now - 2 * HOUR, 2),
        game('c', now - HOUR, 8),
      ],
      sessionStart: null,
    };
    expect(sessionGames(history, now).map((g) => g.seed)).toEqual(['a', 'b', 'c']);
    expect(sessionGames({ ...history, sessionStart: now - 90 * 60 * 1000 }, now)).toHaveLength(1);
    expect(sessionGames(history, now - HOUR + SESSION_GAP_MS + 1)).toEqual([]);
  });

  it('summarizes a session', () => {
    const summary = summarize([game('a', 1, 1), game('b', 2, 6), game('c', 3, 2, true)]);
    expect(summary).toEqual({ games: 3, average: 3, wins: 2, firsts: 1, places: [1, 6, 2] });
    expect(summarize([]).average).toBeNull();
  });
});

const file = process.env.FLINT_ENTITIES;

describe.skipIf(!file)('a recorded game', () => {
  it('has a final placement', () => {
    const list = JSON.parse(readFileSync(file!, 'utf8')) as Hearthstone.Entity[];
    const all = new Map(list.map((e) => [e.entity_id, e]));
    const mine = list.find(
      (e) => e.tags.CARDTYPE === 'PLAYER' && e.tags.BACON_DUMMY_PLAYER !== '1',
    );
    const gameEntity = list.find((e) => e.tags.CARDTYPE === 'GAME');
    const record = recordGame(all, mine?.entity_id, gameEntity?.entity_id, {
      endedAt: 0,
      duos: false,
      tribes: [],
    });
    console.log(JSON.stringify(record));
    expect(record?.place).toBeGreaterThanOrEqual(1);
  });
});
