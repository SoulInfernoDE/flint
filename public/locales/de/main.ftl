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
setting-show-board = Eigenes Brett im Panel anzeigen
