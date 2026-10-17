import { mount } from 'svelte';
import { start } from '../battlegrounds/store.svelte';
import '../battlegrounds/styles.css';
import Minions from './Minions.svelte';
import './minions.css';

const target = document.getElementById('app');
if (!target) throw new Error('missing #app mount point');

mount(Minions, { target });
void start();
