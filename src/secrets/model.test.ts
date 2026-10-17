import type { Hearthstone } from '@overlay/sdk';
import { describe, expect, it } from 'vitest';
import type { Entities } from '../battlegrounds/model';
import { toCollectibleMap, type Collectible } from '../lib/card-data';
import { SecretsLog, candidates } from './model';

const secret = (dbf: number, id: string, name: string, cls: string, set: string): Collectible => [
  dbf,
  id,
  name,
  3,
  'COMMON',
  'SPELL',
  [cls, set],
];

const db = toCollectibleMap([
  secret(1, 'EX1_289', 'Ice Barrier', 'MAGE', 'EXPERT1'),
  secret(2, 'CORE_EX1_289', 'Ice Barrier', 'MAGE', 'CORE'),
  secret(3, 'CORE_EX1_287', 'Counterspell', 'MAGE', 'CORE'),
  secret(4, 'CORE_BAR_812', 'Oasis Ally', 'MAGE', 'CORE'),
  secret(5, 'JAIL_315', 'Mystic Misdirection', 'MAGE', 'ESCAPEFROM_VIOLET_HOLD'),
  secret(6, 'OLD_123', 'Old Secret', 'MAGE', 'NAXX'),
  secret(7, 'CORE_EX1_610', 'Explosive Trap', 'HUNTER', 'CORE'),
  [8, 'CS2_029', 'Fireball', 4, 'FREE', 'SPELL'],
]);

describe('secret candidates', () => {
  it('lists the class secrets of the format, one per name', () => {
    const names = (format: string | null) =>
      candidates(db, 'MAGE', format).map((c) => `${c.name} ${c.id}`);
    expect(names('FT_STANDARD')).toEqual([
      'Counterspell CORE_EX1_287',
      'Ice Barrier CORE_EX1_289',
      'Mystic Misdirection JAIL_315',
      'Oasis Ally CORE_BAR_812',
    ]);
    expect(names('FT_WILD')).toContain('Old Secret OLD_123');
    expect(names('FT_WILD')).toHaveLength(5);
  });
});

function entities(list: [number, string | null, Record<string, string>][]): Entities {
  return new Map(list.map(([id, cardId, tags]) => [id, { entity_id: id, card_id: cardId, tags }]));
}

// The user is player 1, the opponent player 2 with one hidden secret (50).
const board = entities([
  [10, 'CS2_182', { CONTROLLER: '1', CARDTYPE: 'MINION', ZONE: 'PLAY' }],
  [11, 'HERO_08', { CONTROLLER: '2', CARDTYPE: 'HERO', ZONE: 'PLAY' }],
  [12, 'CS2_029', { CONTROLLER: '1', CARDTYPE: 'SPELL', ZONE: 'PLAY' }],
  [50, null, { CONTROLLER: '2', CARDTYPE: 'SPELL', ZONE: 'SECRET', SECRET: '1' }],
]);

type Event = Hearthstone.GameEvent;
const attack = (attacker: number, defender: number): Event => ({
  name: 'attack',
  data: { attacker, defender, side: 'friendly' },
});
const turn = (n: number, side: Hearthstone.Side): Event => ({
  name: 'turn-start',
  data: { turn: n, side },
});
const move = (id: number, from: string | null, to: string): Event => ({
  name: 'zone-change',
  data: { entity_id: id, card_id: null, side: 'unknown', from, to },
});

function ruledOut(log: SecretsLog, game: Entities = board): string[] {
  const all = candidates(db, 'MAGE', 'FT_STANDARD');
  return log
    .slots(game, '2', all)[0]!
    .candidates.filter((c) => c.ruledOut)
    .map((c) => c.card.name);
}

function play(events: Event[], game: Entities = board): SecretsLog {
  const log = new SecretsLog();
  for (const event of events) log.apply(event, game, '1', '2');
  return log;
}

describe('secret helper', () => {
  it('rules out what an attack on the hero would have triggered', () => {
    const log = play([turn(3, 'friendly'), attack(10, 11), turn(4, 'opposing')]);
    expect(ruledOut(log)).toEqual(['Ice Barrier', 'Mystic Misdirection']);
  });

  it('rules out nothing when a secret reacted', () => {
    // Another secret of the opponent (51) reacted, so 50 may still be anything.
    const game: Entities = new Map([
      ...board,
      [
        51,
        { entity_id: 51, card_id: 'CORE_EX1_289', tags: { CONTROLLER: '2', ZONE: 'GRAVEYARD' } },
      ],
    ]);
    const log = play(
      [turn(3, 'friendly'), attack(10, 11), move(51, 'secret', 'graveyard'), turn(4, 'opposing')],
      game,
    );
    expect(ruledOut(log, game)).toEqual([]);
  });

  it('rules out Counterspell after a spell resolved', () => {
    const log = play([turn(3, 'friendly'), move(12, 'hand', 'play'), turn(4, 'opposing')]);
    expect(ruledOut(log)).toEqual(['Counterspell']);
  });

  it('keeps choices made by hand', () => {
    const log = play([turn(3, 'friendly'), attack(10, 11), turn(4, 'opposing')]);
    log.toggle(50, 'CORE_EX1_289', false);
    log.toggle(50, 'CORE_BAR_812', true);
    expect(ruledOut(log)).toEqual(['Mystic Misdirection', 'Oasis Ally']);
  });

  it('knows a revealed secret cannot be there twice', () => {
    const revealed: Entities = new Map([
      ...board,
      [
        52,
        {
          entity_id: 52,
          card_id: 'CORE_EX1_287',
          tags: { CONTROLLER: '2', ZONE: 'SECRET', SECRET: '1' },
        },
      ],
    ]);
    expect(ruledOut(new SecretsLog(), revealed)).toEqual(['Counterspell']);
  });
});
