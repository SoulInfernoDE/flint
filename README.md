# Flint

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/branding/logo-dark.svg">
    <img src="assets/branding/logo-light.svg" alt="Flint" width="320">
  </picture>
</p>

> English original. German version: [README.de.md](README.de.md)

**Flint** is a free, open-source Hearthstone companion for [overLay](https://github.com/SoulInfernoDE/overLay). Its features and look follow Firestone, but Flint is an independent clean-room implementation: no code, images or texts are taken from Firestone.

Flint's primary target is the **native Linux client** launched through [hearthstone-linux-gui](https://github.com/DawnMagnet/hearthstone-linux-gui) (no Wine). Wine/Proton and Windows follow, as overLay supports them.

> **Status: pre-alpha.** Battlegrounds comes first. Flint runs in overLay's developer mode; it is not in a mod index yet.

## Features

Battlegrounds panel in the game:

- **Lobby:** all eight heroes by leaderboard place, with tavern tier, health and armor, eliminated players, you, your next opponent and the player you are fighting
- **Last seen board** of an opponent when you hover over their row
- **Your board:** minions with attack/health and tier, golden minions marked
- **Tavern tier and gold** (including temporary gold)
- **Tribes of the lobby:** confirmed from the minions you see; once all five are known, the banned ones are shown too
- **Minions by tier:** a bar with the tavern tiers; click one to list the minions this lobby can offer, by tribe, with stats; filter by keyword (Battlecry, Deathrattle, Divine Shield …)
- **Session recap:** games, average placement and top 4 finishes of the current session in the panel; the full history (hero, placement, tavern tier, tribes) on Flint's page in the overLay launcher, where you can also start a new session. A break of more than four hours starts one by itself

Deck tracker in games with a deck (Ranked, Casual, practice and more):

- **Your deck:** every card of the list with mana cost, rarity and the copies still in the deck; cards drawn are taken off, empty rows are greyed out
- **Draw chance** of each card and the number of cards in the deck
- With a loaner deck the list is unknown; the tracker then shows the cards drawn so far
- **Opponent:** their hand by slot, with the turn each card was drawn, the starting hand, the Coin, known cards and cards changed in hand (buffs, with the card that did it); the cards they played with the turn; the cards left in their deck

Everything follows the game as you see it: combat results appear when the combat is shown, not before.

Planned: deck statistics, secrets helper and Arena helpers.

## Privacy

Flint has no telemetry, no ads and no account. It only contacts the hosts declared in its manifest, and overLay blocks everything else:

| Host | Used for |
|---|---|
| `api.hearthstonejson.com` | Card names and data in your language (cached for 24 hours; collectible cards only once you play a game with a deck) |
| `art.hearthstonejson.com` | Card and hero images |

Your game history stays on your computer, in Flint's overLay storage.

Game data comes from overLay, which reads Hearthstone's own log files. Flint never touches the game process.

## Development

You need Node.js 26 (see `.nvmrc`) and overLay with developer mode.

```bash
git clone --recurse-submodules https://github.com/SoulInfernoDE/flint.git
cd flint
npm ci
npm run build
```

Then in overLay: Settings → Developer mode → add the full path of `flint/dist`. After a rebuild (or `npm run watch`), use *Reload mods*.

| Command | Purpose |
|---|---|
| `npm run build` / `watch` | Build the mod into `dist/` |
| `npm run check` | Type and Svelte checks |
| `npm test` | Unit tests |
| `npm run format` | Format with Prettier |

The `overlay` folder is a Git submodule with overLay; Flint uses its SDK (`overlay/sdk`). See overLay's [guide for mod authors](https://github.com/SoulInfernoDE/overLay/blob/main/docs/mod-development.md).

To test against a real game, dump its entities with overLay's replay tool and point the test at the file:

```bash
cargo run --manifest-path overlay/Cargo.toml -p overlay-hearthstone --example replay -- /path/to/Power.log entities.json
FLINT_ENTITIES=entities.json npm test
```

## Contributing

Contributions are welcome, see overLay's [contributing guide](https://github.com/SoulInfernoDE/overLay/blob/main/CONTRIBUTING.md) and [code of conduct](https://github.com/SoulInfernoDE/overLay/blob/main/CODE_OF_CONDUCT.md). Please work clean-room: describe Firestone's behaviour in your own words, but never copy its code or assets.

## License

Flint is licensed under the [GNU General Public License v3.0 or later](LICENSE). The logos in `assets/branding/` and `public/icon.svg` are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Card data and images: [HearthstoneJSON](https://hearthstonejson.com/). Hearthstone is a trademark of Blizzard Entertainment, Inc. Flint is not affiliated with or endorsed by Blizzard Entertainment or the Firestone project.
