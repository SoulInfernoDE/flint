<script lang="ts">
  import { overlay } from '@overlay/sdk';
  import { tileUrl } from '../lib/cards';
  import { flint, t, toggleSecret } from '../battlegrounds/store.svelte';
  import CounterBar from '../deck/CounterBar.svelte';
  import type { HandCard } from './model';

  let panel: HTMLElement | null | undefined = $state();
  let header: HTMLElement | null | undefined = $state();

  const opponent = $derived(flint.settings['show-opponent'] === false ? null : flint.opponent);

  // Only the panel takes clicks; outside games with decks everything goes to the game.
  $effect(() => {
    if (!opponent || !panel) {
      void overlay.windows.setClickThrough(true);
      return;
    }
    void overlay.windows.setClickThrough(false);
    const target = panel;
    const report = () => {
      const r = target.getBoundingClientRect();
      void overlay.windows.setInteractiveRegions([
        { x: r.x, y: r.y, width: r.width, height: r.height },
      ]);
    };
    const observer = new ResizeObserver(report);
    observer.observe(target);
    report();
    return () => observer.disconnect();
  });

  $effect(() => {
    if (header) overlay.windows.makeDraggable(header);
  });

  /** The Coin and its variants are not collectible, so not in the card list. */
  function name(cardId: string): string {
    const card = flint.collectible?.byId.get(cardId);
    if (card) return card.name;
    return cardId.startsWith('GAME_005') ? t('opp-coin') : t('opp-created-card');
  }

  function enchantedTitle(card: HandCard): string {
    const names = card.enchantedBy.map((id) => (id ? name(id) : t('opp-hidden-card')));
    return t('opp-enchanted-by', { cards: names.join(', ') });
  }

  function cost(cardId: string | null): string {
    const card = cardId ? flint.collectible?.byId.get(cardId) : undefined;
    return card ? String(card.cost) : '';
  }

  function origin(card: HandCard): string {
    const turn = card.turn ?? 0;
    switch (card.source) {
      case 'drawn':
        return card.starting ? t('opp-starting-hand') : t('opp-drawn', { turn });
      case 'created':
        // Before the first turn, the only card made for the opponent is the Coin.
        if (card.starting) return t('opp-coin');
        return card.createdBy
          ? t('opp-created-by-turn', { card: name(card.createdBy), turn })
          : t('opp-created', { turn });
      case 'returned':
        return t('opp-returned', { turn });
      default:
        return t('opp-unknown-origin');
    }
  }
</script>

{#if opponent}
  <section class="panel opponent" bind:this={panel}>
    <header bind:this={header}>
      <img class="logo" src="./icon.svg" alt="" />
      <span class="title">{t('opp-title')}</span>
      <span class="left">{t('deck-in-deck', { count: opponent.deckCount })}</span>
    </header>

    {#each flint.secrets as slot, index (slot.entityId)}
      <h2>
        {t('secret-title', { number: index + 1 })}{#if slot.turn !== null}
          · {t('opp-turn', { turn: slot.turn })}{/if}
      </h2>
      <ul class="secrets">
        {#each slot.candidates as option (option.card.id)}
          <li class:out={option.ruledOut}>
            <button
              title={option.ruledOut ? t('secret-rule-in') : t('secret-rule-out')}
              onclick={() => toggleSecret(slot.entityId, option.card.id, !option.ruledOut)}
            >
              <span class="cost">{option.card.cost}</span>
              <span class="name">{option.card.name}</span>
              {#if option.byHand}<span class="by-hand">✋</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {/each}

    <h2>{t('opp-hand', { count: opponent.hand.length })}</h2>
    <ol class="hand">
      {#each opponent.hand as card, index (card.entityId)}
        <li>
          <span class="slot">{index + 1}</span>
          {#if card.cardId}
            <span class="name known">{name(card.cardId)}</span>
          {:else}
            <span class="name">{origin(card)}</span>
          {/if}
          {#if card.enchantedBy.length > 0}
            <span class="enchanted" title={enchantedTitle(card)}
              >✦{card.enchantedBy.length > 1 ? card.enchantedBy.length : ''}</span
            >
          {/if}
          {#if card.createdBy}
            <span class="created" title={t('opp-created-by', { card: name(card.createdBy) })}
              >★</span
            >
          {/if}
        </li>
      {/each}
    </ol>

    <h2>{t('opp-played', { count: opponent.played.length })}</h2>
    {#if opponent.played.length === 0}
      <p class="note">{t('opp-nothing-played')}</p>
    {:else}
      <ul class="cards">
        {#each opponent.played as card (card.entityId)}
          <li>
            <span class="cost">{cost(card.cardId)}</span>
            <span class="name">{card.cardId ? name(card.cardId) : '?'}</span>
            {#if card.cardId}
              <img
                class="tile"
                src={tileUrl(card.cardId)}
                alt=""
                loading="lazy"
                onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
              />
            {/if}
            <span class="turn">{t('opp-turn', { turn: card.turn })}</span>
          </li>
        {/each}
      </ul>
    {/if}
    <CounterBar counters={flint.counters.opposing} side="opposing" />
  </section>
{/if}
