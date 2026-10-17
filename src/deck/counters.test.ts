import { describe, expect, it } from 'vitest';
import type { Entities } from '../battlegrounds/model';
import { counters } from './counters';

function entities(list: [number, Record<string, string>][]): Entities {
  return new Map(list.map(([id, tags]) => [id, { entity_id: id, card_id: null, tags }]));
}

describe('counters', () => {
  it('adds up the board and reads the player tags', () => {
    const game = entities([
      [
        2,
        {
          CARDTYPE: 'PLAYER',
          PLAYER_ID: '1',
          HERO_ENTITY: '9',
          CORPSES: '4',
          NUM_SPELLS_PLAYED_THIS_GAME: '3',
        },
      ],
      [9, { CARDTYPE: 'HERO', CONTROLLER: '1', ZONE: 'PLAY', ATK: '2', CLASS: 'DEATHKNIGHT' }],
      [10, { CARDTYPE: 'MINION', CONTROLLER: '1', ZONE: 'PLAY', ATK: '3' }],
      [11, { CARDTYPE: 'MINION', CONTROLLER: '1', ZONE: 'HAND', ATK: '5' }],
      [12, { CARDTYPE: 'MINION', CONTROLLER: '2', ZONE: 'PLAY', ATK: '7' }],
      [13, { CARDTYPE: 'SPELL', CONTROLLER: '1', ZONE: 'DECK' }],
    ]);
    expect(counters(game, 2)).toEqual({
      boardAttack: 5,
      nextFatigue: null,
      corpses: 4,
      spellsPlayed: 3,
    });
  });

  it('counts fatigue once the deck is empty, and corpses only for Death Knights', () => {
    const game = entities([
      [2, { CARDTYPE: 'PLAYER', PLAYER_ID: '1', HERO_ENTITY: '9', FATIGUE: '2', CORPSES: '2' }],
      [9, { CARDTYPE: 'HERO', CONTROLLER: '1', ZONE: 'PLAY', CLASS: 'PALADIN' }],
    ]);
    expect(counters(game, 2)).toMatchObject({ nextFatigue: 3, corpses: null, spellsPlayed: 0 });
  });
});
