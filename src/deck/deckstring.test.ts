import { describe, expect, it } from 'vitest';
import { decodeDeck } from './deckstring';

describe('deck codes', () => {
  it('decodes the Paladin starter deck from a real Decks.log', () => {
    const deck = decodeDeck(
      'AAECAZ8FAqqKBO2fBA6cnwShnwSonwTrnwTunwShoATJoATWoASS1ASc1ASU9QW0nga1ngaGowYAAA==',
    );
    expect(deck.format).toBe(2);
    expect(deck.heroes).toEqual([671]);
    expect(deck.cards.reduce((sum, c) => sum + c.count, 0)).toBe(30);
    expect(deck.cards.filter((c) => c.count === 1)).toHaveLength(2);
  });

  it('rejects other text', () => {
    expect(() => decodeDeck('aGVsbG8=')).toThrow();
  });
});
