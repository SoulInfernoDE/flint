import { mount } from 'svelte';
import { start } from '../battlegrounds/store.svelte';
import '../battlegrounds/styles.css';
import '../deck/deck.css';
import Opponent from './Opponent.svelte';
import './opponent.css';

const target = document.getElementById('app');
if (!target) throw new Error('missing #app mount point');

mount(Opponent, { target });
void start({ opponent: true });
