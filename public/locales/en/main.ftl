mod-description = Hearthstone companion: Battlegrounds lobby, tavern and opponents, with more to come. A free, open-source recreation in the spirit of Firestone.

bg-title = Battlegrounds
bg-tavern =
    { $tier ->
       *[other] Tavern { $tier }
    }
bg-gold = { $gold } / { $max } gold
bg-lobby = Lobby
bg-choosing-hero = Choosing heroes …
bg-next = next
bg-fighting = fighting
bg-you = you
bg-dead = out
bg-board = Your board
bg-board-empty = No minions yet.
bg-last-board = Last seen board
bg-last-board-none = Not fought yet.
bg-turn = Turn { $turn }
bg-loading-cards = Loading card data …
bg-cards-failed = Card names unavailable ({ $error }).
bg-tribes = Tribes of this lobby
bg-tribe-banned = Not in this lobby
bg-tribes-unknown = +{ $count } unknown
bg-tribe =
    { $tribe ->
        [BEAST] Beasts
        [DEMON] Demons
        [DRAGON] Dragons
        [ELEMENTAL] Elementals
        [MECHANICAL] Mechs
        [MURLOC] Murlocs
        [NAGA] Naga
        [PIRATE] Pirates
        [QUILBOAR] Quilboar
        [UNDEAD] Undead
        [ABERRATION] Aberrations
        [ALL] All tribes
        [NEUTRAL] Neutral
       *[other] { $tribe }
    }
bg-mechanic =
    { $mechanic ->
        [BATTLECRY] Battlecry
        [DEATHRATTLE] Deathrattle
        [BACON_RALLY] Rally
        [START_OF_COMBAT] Start of Combat
        [END_OF_TURN_TRIGGER] End of turn
        [AVENGE] Avenge
        [BACON_SPELLCRAFT_ID] Spellcraft
        [DIVINE_SHIELD] Divine Shield
        [TAUNT] Taunt
        [REBORN] Reborn
        [WINDFURY] Windfury
        [VENOMOUS] Venomous
        [MAGNETIC] Magnetic
       *[other] { $mechanic }
    }
bg-minions = Minions by tier
bg-minions-count =
    { $count ->
        [one] 1 minion
       *[other] { $count } minions
    }
bg-minions-incomplete = Not all tribes are known yet, so minions of every possible tribe are listed.
setting-show-minions = Show the minion list by tier
bg-session = This session
bg-session-empty = No finished games yet.
bg-session-summary =
    { $games ->
        [one] 1 game
       *[other] { $games } games
    } · avg. place { NUMBER($average, maximumFractionDigits: 1) } · { $wins } top 4
history-title = Battlegrounds history
history-new-session = Start a new session
history-games = Games
history-empty = No games recorded yet. Flint records every Battlegrounds game that ends while overLay runs.
history-col-date = Ended
history-col-hero = Hero
history-col-place = Place
history-col-tier = Tavern
history-col-tribes = Tribes
deck-loaner = Loaner deck
deck-in-deck = { $count } in deck
deck-in-deck-title = Cards in your deck now, including cards shuffled in during the game
deck-unlisted = The deck list is unknown (loaner deck), so the cards seen so far are listed.
setting-show-deck = Show your deck in games with a deck
opp-title = Opponent
opp-hand = { $count ->
        [one] Hand: 1 card
       *[other] Hand: { $count } cards
    }
opp-played = { $count ->
        [one] Played: 1 card
       *[other] Played: { $count } cards
    }
opp-nothing-played = Nothing played yet.
opp-starting-hand = Starting hand
opp-drawn = Drawn on turn { $turn }
opp-unknown-origin = Drawn before Flint started
opp-created = Created on turn { $turn }
opp-created-by-turn = { $card }, turn { $turn }
opp-returned = Back in hand on turn { $turn }
opp-enchanted-by = Changed in hand by { $cards }
opp-hidden-card = a hidden card
opp-turn = Turn { $turn }
opp-coin = The Coin
opp-created-card = Created card
opp-created-by = Created by { $card }
setting-show-opponent = Show the opponent's hand and played cards
counter-attack-title = Attack on the board (minions and hero)
counter-fatigue = Fatigue { $damage }
counter-fatigue-title = The deck is empty: the next draw deals this much fatigue damage
counter-corpses = { $count ->
        [one] 1 corpse
       *[other] { $count } corpses
    }
counter-corpses-title = Corpses for Death Knight cards
counter-spells = { $count ->
        [one] 1 spell played
       *[other] { $count } spells played
    }
counter-turn-title = Time in this turn
counter-schools = { $count ->
        [one] 1 spell school
       *[other] { $count } spell schools
    }
spell-school =
    { $school ->
        [1] Arcane
        [2] Fire
        [3] Frost
        [4] Nature
        [5] Holy
        [6] Shadow
        [7] Fel
       *[other] School { $school }
    }
setting-show-board = Show your board in the panel
