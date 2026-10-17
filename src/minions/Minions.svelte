<script lang="ts">
  import { overlay } from '@overlay/sdk';
  import { tileUrl } from '../lib/cards';
  import { flint, t } from '../battlegrounds/store.svelte';
  import { lobbyMinions } from '../battlegrounds/tribes';

  let bar: HTMLElement | undefined = $state();
  let grip: HTMLElement | undefined = $state();
  let list: HTMLElement | undefined = $state();
  /** The tier whose list is open, if any. */
  let open: number | null = $state(null);

  const bg = $derived(flint.bg);
  const shown = $derived(bg !== null && flint.settings['show-minions'] !== false);
  const tiers = $derived(bg ? Array.from({ length: bg.maxTier }, (_, i) => i + 1) : []);
  const groups = $derived(
    open !== null && flint.tribes ? lobbyMinions(flint.cards, flint.tribes, open, flint.duos) : [],
  );
  const count = $derived(groups.reduce((sum, group) => sum + group.minions.length, 0));

  // Only the tier bar and the open list take clicks; the rest goes to the game.
  $effect(() => {
    if (!shown || !bar) {
      void overlay.windows.setClickThrough(true);
      return;
    }
    void overlay.windows.setClickThrough(false);
    const parts = [bar, list].filter((el): el is HTMLElement => el !== undefined);
    const report = () => {
      void overlay.windows.setInteractiveRegions(
        parts.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
    };
    const observer = new ResizeObserver(report);
    for (const part of parts) observer.observe(part);
    report();
    return () => observer.disconnect();
  });

  $effect(() => {
    if (grip) overlay.windows.makeDraggable(grip);
  });

  // A finished game closes the list.
  $effect(() => {
    if (!bg) open = null;
  });
</script>

{#if shown && bg}
  <div class="minions">
    <nav class="tier-bar" bind:this={bar} aria-label={t('bg-minions')}>
      <img class="grip" bind:this={grip} src="./icon.svg" alt="" title={t('bg-minions')} />
      {#each tiers as tier (tier)}
        <button
          class:current={bg.tier === tier}
          class:open={open === tier}
          title={t('bg-tavern', { tier })}
          onclick={() => (open = open === tier ? null : tier)}>{tier}</button
        >
      {/each}
    </nav>

    {#if open !== null}
      <section class="panel minion-list" bind:this={list}>
        <h2>
          {t('bg-tavern', { tier: open })} · {t('bg-minions-count', { count })}
        </h2>
        {#if flint.cardsLoading}
          <p class="note">{t('bg-loading-cards')}</p>
        {:else if flint.tribes && flint.tribes.unknown > 0}
          <p class="note">{t('bg-minions-incomplete')}</p>
        {/if}
        {#each groups as group (group.tribe ?? '')}
          <h3>{t('bg-tribe', { tribe: group.tribe ?? 'NEUTRAL' })}</h3>
          <ul>
            {#each group.minions as minion (minion.cardId)}
              <li>
                <img
                  class="tile"
                  src={tileUrl(minion.cardId)}
                  alt=""
                  loading="lazy"
                  onerror={(e) =>
                    ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
                />
                <span class="name">{minion.name}</span>
                <span class="stats">{minion.attack}/{minion.health}</span>
              </li>
            {/each}
          </ul>
        {/each}
      </section>
    {/if}
  </div>
{/if}
