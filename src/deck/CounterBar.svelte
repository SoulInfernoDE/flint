<script lang="ts">
  import type { Hearthstone } from '@overlay/sdk';
  import { flint, t } from '../battlegrounds/store.svelte';
  import type { Counters } from './counters';

  let { counters, side }: { counters: Counters | null; side: Hearthstone.Side } = $props();

  /** When this side's running turn began, if it is their turn. */
  const startedAt = $derived(flint.turn?.side === side ? flint.turn.startedAt : null);
  let now = $state(Date.now());

  $effect(() => {
    if (startedAt === null) return;
    now = Date.now();
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });

  function clock(ms: number): string {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function schools(list: number[]): string {
    return list.map((school) => t('spell-school', { school: String(school) })).join(', ');
  }
</script>

{#if counters}
  <div class="counters">
    <span class="attack" title={t('counter-attack-title')}>⚔ {counters.boardAttack}</span>
    {#if startedAt !== null}
      <span class="timer" title={t('counter-turn-title')}>⏱ {clock(now - startedAt)}</span>
    {/if}
    {#if counters.nextFatigue !== null}
      <span class="warn" title={t('counter-fatigue-title')}
        >{t('counter-fatigue', { damage: counters.nextFatigue })}</span
      >
    {/if}
    {#if counters.corpses !== null}
      <span title={t('counter-corpses-title')}
        >{t('counter-corpses', { count: counters.corpses })}</span
      >
    {/if}
    {#if counters.spellsPlayed > 0}
      <span>{t('counter-spells', { count: counters.spellsPlayed })}</span>
    {/if}
    {#if counters.spellSchools.length > 0}
      <span title={schools(counters.spellSchools)}
        >{t('counter-schools', { count: counters.spellSchools.length })}</span
      >
    {/if}
  </div>
{/if}

<style>
  .counters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    padding: 4px 8px 6px;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 11px;
  }

  .attack {
    color: var(--text);
    font-weight: 700;
  }

  .timer {
    color: var(--gold);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .warn {
    color: var(--danger);
    font-weight: 600;
  }
</style>
