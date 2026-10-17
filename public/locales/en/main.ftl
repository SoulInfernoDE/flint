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
bg-minions = Minions by tier
bg-minions-count =
    { $count ->
        [one] 1 minion
       *[other] { $count } minions
    }
bg-minions-incomplete = Not all tribes are known yet, so minions of every possible tribe are listed.
setting-show-minions = Show the minion list by tier
setting-show-board = Show your board in the panel
