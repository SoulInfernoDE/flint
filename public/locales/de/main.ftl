mod-description = Hearthstone-Begleiter: Schlachtfeld-Lobby, Taverne und Gegner, weiteres folgt. Ein freier, quelloffener Nachbau im Geist von Firestone.

bg-title = Schlachtfeld
bg-tavern =
    { $tier ->
       *[other] Taverne { $tier }
    }
bg-gold = { $gold } / { $max } Gold
bg-lobby = Lobby
bg-choosing-hero = Heldenwahl …
bg-next = als Nächstes
bg-fighting = im Kampf
bg-you = du
bg-dead = raus
bg-board = Dein Brett
bg-board-empty = Noch keine Diener.
bg-last-board = Zuletzt gesehenes Brett
bg-last-board-none = Noch nicht gegeneinander gekämpft.
bg-turn = Zug { $turn }
bg-loading-cards = Kartendaten werden geladen …
bg-cards-failed = Kartennamen nicht verfügbar ({ $error }).
bg-tribes = Völker dieser Lobby
bg-tribe-banned = Nicht in dieser Lobby
bg-tribes-unknown = +{ $count } unbekannt
bg-tribe =
    { $tribe ->
        [BEAST] Wildtiere
        [DEMON] Dämonen
        [DRAGON] Drachen
        [ELEMENTAL] Elementare
        [MECHANICAL] Mechs
        [MURLOC] Murlocs
        [NAGA] Naga
        [PIRATE] Piraten
        [QUILBOAR] Stacheleber
        [UNDEAD] Untote
        [ABERRATION] Abscheulichkeiten
        [ALL] Alle Völker
        [NEUTRAL] Neutral
       *[other] { $tribe }
    }
bg-mechanic =
    { $mechanic ->
        [BATTLECRY] Kampfschrei
        [DEATHRATTLE] Todesröcheln
        [BACON_RALLY] Mobilisieren
        [START_OF_COMBAT] Kampfbeginn
        [END_OF_TURN_TRIGGER] Zugende
        [AVENGE] Rache
        [BACON_SPELLCRAFT_ID] Zauberkunde
        [DIVINE_SHIELD] Gottesschild
        [TAUNT] Spott
        [REBORN] Wiederkehr
        [WINDFURY] Windzorn
        [VENOMOUS] Toxisch
        [MAGNETIC] Magnetisch
       *[other] { $mechanic }
    }
bg-minions = Diener nach Stufe
bg-minions-count =
    { $count ->
        [one] 1 Diener
       *[other] { $count } Diener
    }
bg-minions-incomplete = Noch sind nicht alle Völker bekannt, darum stehen hier Diener aller möglichen Völker.
setting-show-minions = Dienerliste nach Stufe anzeigen
bg-session = Diese Sitzung
bg-session-empty = Noch keine beendete Partie.
bg-session-summary =
    { $games ->
        [one] 1 Partie
       *[other] { $games } Partien
    } · Ø Platz { NUMBER($average, maximumFractionDigits: 1) } · { $wins }× Top 4
history-title = Schlachtfeld-Verlauf
history-new-session = Neue Sitzung beginnen
history-games = Partien
history-empty = Noch keine Partien aufgezeichnet. Flint zeichnet jede Schlachtfeld-Partie auf, die endet, während overLay läuft.
history-col-date = Beendet
history-col-hero = Held
history-col-place = Platz
history-col-tier = Taverne
history-col-tribes = Völker
deck-loaner = Leihdeck
deck-in-deck = { $count } im Deck
deck-in-deck-title = Karten jetzt in deinem Deck, auch die während der Partie hineingemischten
deck-unlisted = Die Deckliste ist unbekannt (Leihdeck), darum stehen hier die bisher gesehenen Karten.
setting-show-deck = Dein Deck in Partien mit Deck anzeigen
opp-title = Gegner
opp-hand = { $count ->
        [one] Hand: 1 Karte
       *[other] Hand: { $count } Karten
    }
opp-played = { $count ->
        [one] Gespielt: 1 Karte
       *[other] Gespielt: { $count } Karten
    }
opp-nothing-played = Noch nichts gespielt.
opp-starting-hand = Starthand
opp-drawn = Gezogen in Zug { $turn }
opp-unknown-origin = Gezogen, bevor Flint lief
opp-created = Erschaffen in Zug { $turn }
opp-created-by-turn = { $card }, Zug { $turn }
opp-returned = Zurück auf der Hand in Zug { $turn }
opp-enchanted-by = Auf der Hand verändert durch { $cards }
opp-hidden-card = eine verdeckte Karte
opp-turn = Zug { $turn }
opp-coin = Die Münze
opp-created-card = Erschaffene Karte
opp-created-by = Erschaffen von { $card }
setting-show-opponent = Hand und gespielte Karten des Gegners anzeigen
counter-attack-title = Angriff auf dem Brett (Diener und Held)
counter-fatigue = Erschöpfung { $damage }
counter-fatigue-title = Das Deck ist leer: Das nächste Ziehen verursacht so viel Erschöpfungsschaden
counter-corpses = { $count ->
        [one] 1 Leiche
       *[other] { $count } Leichen
    }
counter-corpses-title = Leichen für Karten des Todesritters
counter-spells = { $count ->
        [one] 1 Zauber gespielt
       *[other] { $count } Zauber gespielt
    }
counter-turn-title = Zeit in diesem Zug
counter-schools = { $count ->
        [one] 1 Zauberschule
       *[other] { $count } Zauberschulen
    }
spell-school =
    { $school ->
        [1] Arkan
        [2] Feuer
        [3] Frost
        [4] Natur
        [5] Heilig
        [6] Schatten
        [7] Teufel
       *[other] Schule { $school }
    }
setting-show-board = Eigenes Brett im Panel anzeigen
