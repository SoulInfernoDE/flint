// Reactive Battlegrounds state for the panel, fed by the overLay SDK.

import { overlay, type Hearthstone, type SettingValue } from '@overlay/sdk';
import { loadCards, type CardDb } from '../lib/cards';
import { LastBoards, deriveState, isBattlegrounds, type BgState } from './model';

export const flint = $state<{
  ready: boolean;
  /** Bumped when the language changes, so texts re-render. */
  locale: number;
  info: Hearthstone.GameInfo | null;
  bg: BgState | null;
  cards: CardDb;
  cardsError: string | null;
  cardsLoading: boolean;
  settings: Record<string, SettingValue>;
}>({
  ready: false,
  locale: 0,
  info: null,
  bg: null,
  cards: new Map(),
  cardsError: null,
  cardsLoading: true,
  settings: {},
});

export const lastBoards = new LastBoards();

let scheduled = false;

/** Recomputes at most once per frame; combat sends many small batches. */
function recompute(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const info = flint.info;
    if (!info?.in_game || !isBattlegrounds(info.game_type)) {
      flint.bg = null;
      return;
    }
    const state = deriveState(
      overlay.events.entities(),
      info.friendly.player_entity_id,
      info.opposing.player_entity_id,
    );
    if (state) lastBoards.update(state);
    flint.bg = state;
  });
}

async function refreshCards(): Promise<void> {
  flint.cardsLoading = true;
  try {
    flint.cards = await loadCards(overlay.i18n.locale());
    flint.cardsError = null;
  } catch (error) {
    flint.cardsError = String(error);
  } finally {
    flint.cardsLoading = false;
  }
}

export async function start(): Promise<void> {
  await overlay.ready();
  flint.settings = overlay.settings.get();
  flint.info = await overlay.events.getInfo();
  flint.ready = true;
  recompute();

  overlay.events.onInfo((info) => {
    flint.info = info;
    recompute();
  });
  overlay.events.onEntitiesChanged(recompute);
  overlay.events.on((event) => {
    if (event.name === 'game-created') lastBoards.clear();
  });
  overlay.settings.onChange((settings) => (flint.settings = settings));
  overlay.i18n.onChange(() => {
    flint.locale += 1;
    void refreshCards();
  });
  await refreshCards();
}

/** Card name in the current language, or the id while card data is missing. */
export function cardName(cardId: string | null): string {
  if (!cardId) return '?';
  return flint.cards.get(cardId)?.name ?? cardId;
}
