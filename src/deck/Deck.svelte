<script lang="ts">
  import { overlay } from '@overlay/sdk';
  import { tileUrl } from '../lib/cards';
  import { flint, t } from '../battlegrounds/store.svelte';
  import CounterBar from './CounterBar.svelte';

  let panel: HTMLElement | null | undefined = $state();
  let header: HTMLElement | null | undefined = $state();

  const deck = $derived(flint.settings['show-deck'] === false ? null : flint.deck);

  // Only the panel takes clicks; outside games with a deck everything goes to the game.
  $effect(() => {
    if (!deck || !panel) {
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

  /** Chance to draw a copy next, as a whole percentage. */
  function chance(left: number | null): string | null {
    if (!deck || left === null || left === 0 || deck.inDeck === 0) return null;
    return `${Math.round((left / deck.inDeck) * 100)} %`;
  }
</script>

{#if deck}
  <section class="panel deck" bind:this={panel}>
    <header bind:this={header}>
      <img class="logo" src="./icon.svg" alt="" />
      <span class="title">{deck.name ?? t('deck-loaner')}</span>
      <span class="left" title={t('deck-in-deck-title')}
        >{t('deck-in-deck', { count: deck.inDeck })}</span
      >
    </header>
    {#if !deck.listed}
      <p class="note">{t('deck-unlisted')}</p>
    {/if}
    {#if flint.collectible === null}
      <p class="note">{t('bg-loading-cards')}</p>
    {/if}
    <ul class="cards">
      {#each deck.cards as card (card.cardId)}
        <li class:gone={card.left === 0} class={card.rarity.toLowerCase()}>
          <span class="cost">{card.cost}</span>
          <span class="name">{card.name}</span>
          <img
            class="tile"
            src={tileUrl(card.cardId)}
            alt=""
            loading="lazy"
            onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
          />
          {#if chance(card.left)}
            <span class="chance">{chance(card.left)}</span>
          {/if}
          {#if card.left === null ? card.total > 1 : card.left > 1}
            <span class="count">{card.left ?? card.total}</span>
          {:else if card.left === null}
            <span class="count seen">✓</span>
          {/if}
        </li>
      {/each}
    </ul>
    <CounterBar counters={flint.counters.friendly} side="friendly" />
  </section>
{/if}
