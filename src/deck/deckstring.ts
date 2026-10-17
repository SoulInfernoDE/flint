// Hearthstone deck codes ("deckstrings"): base64 of unsigned LEB128 varints.
//
//   0, version (1), format, then three card lists (cards once, twice, n times);
//   heroes come first as a list of dbf ids, n-copy cards as (dbf id, count) pairs.
//   Newer codes may append sideboards, which the deck tracker does not need.

export interface DeckCard {
  dbfId: number;
  count: number;
}

export interface DecodedDeck {
  format: number;
  heroes: number[];
  cards: DeckCard[];
}

/** Decodes a deck code; throws on codes that are not deckstrings. */
export function decodeDeck(code: string): DecodedDeck {
  const bytes = Uint8Array.from(atob(code.trim()), (c) => c.charCodeAt(0));
  let offset = 0;
  const varint = (): number => {
    let value = 0;
    let shift = 0;
    for (;;) {
      if (offset >= bytes.length) throw new Error('deck code ends early');
      const byte = bytes[offset++]!;
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) return value;
      shift += 7;
    }
  };
  const list = (read: () => DeckCard): DeckCard[] => Array.from({ length: varint() }, read);

  if (varint() !== 0) throw new Error('not a deck code');
  const version = varint();
  if (version !== 1) throw new Error(`unknown deck code version ${version}`);
  const format = varint();
  const heroes = list(() => ({ dbfId: varint(), count: 1 })).map((h) => h.dbfId);
  const cards = [
    ...list(() => ({ dbfId: varint(), count: 1 })),
    ...list(() => ({ dbfId: varint(), count: 2 })),
    ...list(() => ({ dbfId: varint(), count: varint() })),
  ];
  return { format, heroes, cards };
}
