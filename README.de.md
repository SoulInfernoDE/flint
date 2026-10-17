# Flint

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/branding/logo-dark.svg">
    <img src="assets/branding/logo-light.svg" alt="Flint" width="320">
  </picture>
</p>

> Deutsche Fassung. Englisches Original: [README.md](README.md)

**Flint** ist ein freier Open-Source-Begleiter für Hearthstone in [overLay](https://github.com/SoulInfernoDE/overLay). Funktionen und Aussehen orientieren sich an Firestone, aber Flint ist eine unabhängige Clean-Room-Umsetzung: Kein Code, keine Bilder und keine Texte stammen aus Firestone.

Hauptziel von Flint ist der **native Linux-Client**, gestartet über [hearthstone-linux-gui](https://github.com/DawnMagnet/hearthstone-linux-gui) (ohne Wine). Wine/Proton und Windows folgen, sobald overLay sie unterstützt.

> **Stand: Pre-Alpha.** Das Schlachtfeld kommt zuerst. Flint läuft im Entwicklermodus von overLay und ist noch in keinem Mod-Index.

## Funktionen

Schlachtfeld-Panel im Spiel:

- **Lobby:** alle acht Helden nach Platzierung, mit Tavernenstufe, Leben und Rüstung, ausgeschiedenen Spielern, dir, deinem nächsten Gegner und dem Spieler, gegen den du gerade kämpfst
- **Zuletzt gesehenes Brett** eines Gegners, wenn du mit der Maus über seine Zeile fährst
- **Dein Brett:** Diener mit Angriff/Leben und Stufe, goldene Diener markiert
- **Tavernenstufe und Gold** (einschließlich Bonusgold)
- **Völker der Lobby:** bestätigt anhand der Diener, die du siehst; sobald alle fünf bekannt sind, erscheinen auch die gesperrten
- **Diener nach Stufe:** eine Leiste mit den Tavernenstufen; ein Klick zeigt die Diener, die diese Lobby anbieten kann, nach Volk und mit Werten; Filter nach Schlüsselwörtern (Kampfschrei, Todesröcheln, Gottesschild …)
- **Sitzungsrückblick:** Partien, durchschnittliche Platzierung und Top-4-Ergebnisse der aktuellen Sitzung im Panel; der vollständige Verlauf (Held, Platzierung, Tavernenstufe, Völker) auf Flints Seite im overLay-Launcher, wo du auch eine neue Sitzung beginnen kannst. Eine Pause von mehr als vier Stunden beginnt von selbst eine neue

Deck-Tracker in Partien mit Deck (Rangliste, Gelegenheitsspiel, Übung und mehr):

- **Dein Deck:** jede Karte der Liste mit Manakosten, Seltenheit und den Exemplaren, die noch im Deck sind; gezogene Karten werden abgezogen, leere Zeilen ausgegraut
- **Ziehchance** jeder Karte und die Zahl der Karten im Deck
- Bei einem Leihdeck ist die Liste unbekannt; der Tracker zeigt dann die bisher gezogenen Karten
- **Gegner:** seine Hand nach Platz, mit dem Zug, in dem jede Karte gezogen wurde, der Starthand, der Münze, bekannten Karten und auf der Hand veränderten Karten (Buffs, mit der verursachenden Karte); die Karten, die er gespielt hat, mit Zug; die Karten in seinem Deck
- **Geheimnis-Helfer:** für jedes verdeckte Geheimnis des Gegners die Geheimnisse seiner Klasse im Format der Partie; die, die bei deinen Aktionen (Angriff auf den Helden, Zauber, Diener ausspielen …) ausgelöst hätten, aber nicht ausgelöst haben, werden ausgeschlossen, weitere per Klick. Die Standard-Erweiterungen stehen in einer Liste, die bei jeder Rotation aktualisiert wird
- **Zähler** für beide Seiten: Angriff auf dem Brett, nächster Erschöpfungsschaden bei leerem Deck, Leichen beim Todesritter, gespielte Zauber und ihre Zauberschulen sowie ein Timer für den laufenden Zug

Alles folgt dem Spiel so, wie du es siehst: Kampfergebnisse erscheinen, wenn der Kampf gezeigt wird, nicht vorher.

Geplant: Deck-Statistiken und Arena-Hilfen.

## Datenschutz

Flint hat keine Telemetrie, keine Werbung und kein Konto. Es kontaktiert nur die im Manifest angegebenen Hosts; alles andere blockiert overLay:

| Host | Wofür |
|---|---|
| `api.hearthstonejson.com` | Kartennamen und -daten in deiner Sprache (24 Stunden zwischengespeichert; sammelbare Karten erst, wenn du eine Partie mit Deck spielst) |
| `art.hearthstonejson.com` | Karten- und Heldenbilder |

Dein Spielverlauf bleibt auf deinem Rechner, im overLay-Speicher von Flint.

Die Spieldaten kommen von overLay, das Hearthstones eigene Logdateien liest. Flint greift nie auf den Spielprozess zu.

## Entwicklung

Du brauchst Node.js 26 (siehe `.nvmrc`) und overLay mit Entwicklermodus.

```bash
git clone --recurse-submodules https://github.com/SoulInfernoDE/flint.git
cd flint
npm ci
npm run build
```

Dann in overLay: Einstellungen → Entwicklermodus → den vollständigen Pfad von `flint/dist` hinzufügen. Nach einem neuen Build (oder mit `npm run watch`) *Mods neu laden*.

| Befehl | Zweck |
|---|---|
| `npm run build` / `watch` | Mod nach `dist/` bauen |
| `npm run check` | Typ- und Svelte-Prüfung |
| `npm test` | Unit-Tests |
| `npm run format` | Mit Prettier formatieren |

Der Ordner `overlay` ist ein Git-Submodul mit overLay; Flint nutzt dessen SDK (`overlay/sdk`). Siehe die [Anleitung für Mod-Autoren](https://github.com/SoulInfernoDE/overLay/blob/main/docs/mod-development.de.md) von overLay.

Um gegen eine echte Partie zu testen, schreib ihre Entitäten mit overLays Replay-Werkzeug in eine Datei und gib sie dem Test mit:

```bash
cargo run --manifest-path overlay/Cargo.toml -p overlay-hearthstone --example replay -- /pfad/zu/Power.log entities.json
FLINT_ENTITIES=entities.json npm test
```

Um eine ganze Schlachtfeld-Partie Schritt für Schritt nachzuspielen, so wie das SDK Flint im Spiel versorgt, und dabei Lobby, Völker, gemerkte Bretter und die aufgezeichnete Platzierung zu prüfen (`cards.json` ist die Kartendatei von HearthstoneJSON):

```bash
REPLAY_ALL_EVENTS=1 cargo run --manifest-path overlay/Cargo.toml -p overlay-hearthstone --example replay -- /pfad/zu/Power.log - events.json
FLINT_GAME_EVENTS=events.json FLINT_CARDS=cards.json npx vitest run src/sim
```

Echte Logs nennen andere Spieler; halte sie und ihre Ausgaben aus dem Repository heraus.

## Mitwirken

Beiträge sind willkommen, siehe den [Leitfaden zum Mitwirken](https://github.com/SoulInfernoDE/overLay/blob/main/CONTRIBUTING.de.md) und den [Verhaltenskodex](https://github.com/SoulInfernoDE/overLay/blob/main/CODE_OF_CONDUCT.de.md) von overLay. Bitte arbeite clean-room: Beschreib das Verhalten von Firestone in eigenen Worten, aber kopiere nie Code oder Grafiken daraus.

## Lizenz

Flint steht unter der [GNU General Public License v3.0 oder neuer](LICENSE). Die Logos in `assets/branding/` und `public/icon.svg` stehen unter [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.de).

Kartendaten und Bilder: [HearthstoneJSON](https://hearthstonejson.com/). Hearthstone ist eine Marke von Blizzard Entertainment, Inc. Flint steht in keiner Verbindung zu Blizzard Entertainment oder dem Firestone-Projekt und wird von ihnen nicht unterstützt.
