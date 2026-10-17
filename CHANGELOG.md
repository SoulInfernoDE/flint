# Changelog

> English original. German version: [CHANGELOG.de.md](CHANGELOG.de.md)

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Battlegrounds panel: lobby by leaderboard place with tavern tier, health and armor, eliminated players, you, your next opponent and the current combat; last seen board of an opponent on hover; your board; tavern tier and gold
- Tribes of the lobby, confirmed from the minions seen in the game, with the banned tribes once all are known
- Minion list by tier in its own overlay window, filtered by the lobby's tribes (Duos-only minions in Duos only)
- Session recap: the panel shows the current session's games, average placement and top 4 finishes; Flint's page in the launcher lists every recorded game and starts a new session on request
- Keyword filter in the minion list (Battlecry, Deathrattle, Rally, Divine Shield and more, named as in the game)
- Deck tracker for games with a deck: the list of the chosen deck (from overLay, read from Hearthstone's `Decks.log`) with the copies left, draw chances and the deck size; the cards seen so far for loaner decks
- Opponent tracker: the opponent's hand with the turn each card came in (starting hand, the Coin, created and returned cards) and the cards changed in hand, the cards they played by turn, and their deck size; it catches up on the game when it starts in the middle of one
- Card names in the game's language and hero images from HearthstoneJSON, cached for 24 hours in overLay's mod storage
- English and German translations
- Logos (CC BY-SA 4.0)
