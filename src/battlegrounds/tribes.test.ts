import { describe, expect, it } from 'vitest';
import { toMap, type Compact } from '../lib/card-data';
import { inferTribes, lobbyMinions, poolTribes } from './tribes';

const POOL = 1;
const DUOS_ONLY = 3;

// A small pool: one minion per tribe on tier 1, plus dual, all-tribe and neutral ones.
const db = toMap([
  ['B1', 'Beast', 'MINION', 1, ['BEAST'], 1, 1, POOL, 'B1_G', ['BATTLECRY']],
  ['B1_G', 'Beast', 'MINION', 1, ['BEAST'], 2, 2, 0, null, []],
  ['D1', 'Demon', 'MINION', 1, ['DEMON'], 1, 1, POOL, null, ['TAUNT', 'BATTLECRY']],
  ['R1', 'Dragon', 'MINION', 1, ['DRAGON'], 1, 1, POOL, null, []],
  ['M1', 'Murloc', 'MINION', 1, ['MURLOC'], 1, 1, POOL, null, []],
  ['P1', 'Pirate', 'MINION', 1, ['PIRATE'], 1, 1, POOL, null, []],
  ['U1', 'Undead', 'MINION', 1, ['UNDEAD'], 1, 1, POOL, null, []],
  ['X1', 'Dual', 'MINION', 1, ['PIRATE', 'UNDEAD'], 1, 1, POOL, null, []],
  ['Y1', 'Dual kept', 'MINION', 1, ['DEMON', 'UNDEAD'], 1, 1, POOL, null, []],
  ['A1', 'Amalgam', 'MINION', 1, ['ALL'], 1, 1, POOL, null, []],
  ['N1', 'Neutral', 'MINION', 1, [], 1, 1, POOL, null, ['DEATHRATTLE']],
  ['N2', 'Duo neutral', 'MINION', 1, [], 1, 1, DUOS_ONLY, null, []],
  ['T1', 'Token', 'MINION', 1, ['PIRATE'], 1, 1, 0, null, []],
  ['B2', 'Beast two', 'MINION', 2, ['BEAST'], 2, 2, POOL, null, []],
] satisfies Compact[]);
const all = poolTribes(db);

describe('lobby tribes', () => {
  it('knows the tribes of the pool', () => {
    expect(all).toEqual(['BEAST', 'DEMON', 'DRAGON', 'MURLOC', 'PIRATE', 'UNDEAD']);
  });

  it('confirms tribes from single-tribe pool minions only', () => {
    // Dual, all-tribe, neutral and non-pool minions prove nothing.
    const tribes = inferTribes(['B1_G', 'X1', 'A1', 'N1', 'T1', 'D1'], db, all);
    expect(tribes).toEqual({ active: ['BEAST', 'DEMON'], banned: [], unknown: 3 });
  });

  it('bans the rest once the lobby is complete', () => {
    const tribes = inferTribes(['B1', 'D1', 'R1', 'M1', 'U1', 'U1'], db, all);
    expect(tribes).toEqual({
      active: ['BEAST', 'DEMON', 'DRAGON', 'MURLOC', 'UNDEAD'],
      banned: ['PIRATE'],
      unknown: 0,
    });
  });
});

describe('minions by tier', () => {
  const complete = inferTribes(['B1', 'D1', 'R1', 'M1', 'U1'], db, all);

  it('lists what the lobby can offer, grouped by tribe', () => {
    const groups = lobbyMinions(db, complete, 1, false);
    expect(groups.map((g) => [g.tribe, g.minions.map((m) => m.cardId)])).toEqual([
      ['BEAST', ['B1']],
      ['DEMON', ['D1', 'Y1']],
      ['DRAGON', ['R1']],
      ['MURLOC', ['M1']],
      // A dual minion counts once its other tribe is in.
      ['UNDEAD', ['X1', 'U1']],
      ['ALL', ['A1']],
      [null, ['N1']],
    ]);
  });

  it('filters by keyword', () => {
    const groups = lobbyMinions(db, complete, 1, false, 'BATTLECRY');
    expect(groups.flatMap((g) => g.minions.map((m) => m.cardId))).toEqual(['B1', 'D1']);
    expect(lobbyMinions(db, complete, 1, false, 'WINDFURY')).toEqual([]);
  });

  it('adds Duos-only minions in Duos and keeps unknown tribes while incomplete', () => {
    const duos = lobbyMinions(db, complete, 1, true);
    expect(duos.find((g) => g.tribe === null)?.minions.map((m) => m.cardId)).toEqual(['N2', 'N1']);
    const early = lobbyMinions(db, inferTribes([], db, all), 1, false);
    expect(early.some((g) => g.tribe === 'PIRATE')).toBe(true);
    expect(lobbyMinions(db, complete, 2, false)[0]?.minions[0]?.cardId).toBe('B2');
  });
});
