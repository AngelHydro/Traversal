# Traversal — règles du jeu

**[Jouer en ligne](https://angelhydro.github.io/Traversal/)**

Traversal est un jeu de stratégie pour deux joueurs qui se joue sur une grille de 10×10 aux hauteurs de terrain variables. Chaque joueur commande six pièces et doit leur faire traverser le plateau puis sortir par le bord opposé pour marquer. Chaque pièce qui traverse rapporte un nombre de points égal à sa Force. Dès que deux pièces ont franchi l'arrivée, quel que soit le joueur auquel elles appartiennent, le score le plus élevé l'emporte.

La traversée ne sera pas facile. Le plateau est un paysage en trois dimensions de montagnes et de vallées, et chaque changement d'altitude coûte du Mouvement en plus. Ton adversaire fonce dans l'autre sens, et vous vous disputerez les positions, en capturant les pièces ennemies et en défendant les vôtres. Les pièces rapides sont plus faibles, les pièces fortes sont plus lentes. Choisir quelles pièces avancer, lesquelles sacrifier et quels chemins emprunter : ces décisions stratégiques sont au cœur de chaque partie.

**En un coup d'œil :** 2 joueurs · 6 pièces chacun · grille 10×10 · 3 types de pièces.

## Plateau

Le plateau est une grille de 10×10 où chaque case a une hauteur, ce qui crée un paysage en trois dimensions de montagnes et de vallées. Deux cases adjacentes diffèrent d'au plus 2 unités de hauteur : le terrain est donc toujours franchissable et il n'y a pas de falaise infranchissable.

Chaque partie se joue sur un plateau différent : tu ne joueras jamais deux fois sur la même carte. Les terrains sont générés pour être équitables ; aucun camp n'a d'avantage notable. Les joueurs peuvent choisir un mode de terrain avant la partie, chacun produisant un style de paysage différent. Si tu possèdes une édition physique de Traversal, tu peux utiliser le Générateur de plateaux pour créer un plateau et faciliter la mise en place.

| Mode | Paysage |
|---|---|
| Aléatoire | Variété équilibrée de terrains |
| Montagnes | Pics centraux spectaculaires |
| Vallées | Cuvettes profondes bordées de crêtes |
| Hautes terres | Montagnes et vallées réunies |
| Bois | Plutôt plat, collines douces |
| Désert | Étendues plates, rares pics |

## Pièces

Chaque joueur commence avec six pièces : deux de chaque type. Les pièces sont placées symétriquement sur les colonnes centrales de leur rangée de départ. Le Mouvement d'une pièce correspond au nombre de côtés de sa base. Sa Force correspond au nombre de pointes à son sommet. Mouvement et Force font toujours 6 : plus une pièce est rapide, plus elle est faible au combat, et inversement.

| Pièce | Forme | Mouvement | Force | Spécial |
|---|---|---|---|---|
| Explorateur | Cône pentagonal | 5 | 1 | Au lieu de son déplacement normal, il peut se déplacer de 1 case en diagonale ou bondir de 2 cases dans une seule direction (avant, arrière, gauche ou droite) depuis sa position de départ, sans tenir compte du coût de hauteur. La pièce la plus mobile du plateau. |
| Avant-garde | Coin en losange | 4 | 2 | Gagne +1 en force d'attaque quand elle utilise ses 4 points de Mouvement pour atteindre une cible. Ces 4 points doivent correspondre au chemin le plus court vers la cible. Récompense un placement agressif. |
| Sentinelle | Prisme triangulaire | 3 | 3 | Si une Sentinelle est la première pièce, tous camps confondus, à franchir l'arrivée, son joueur gagne immédiatement. La pièce la plus précieuse et la plus dangereuse. |

## Mise en place

Le joueur 2 (bleu) occupe la rangée du haut, le joueur 1 (rouge) la rangée du bas. Les pièces sont disposées symétriquement sur les colonnes centrales, dans l'ordre Sentinelle, Avant-garde, Explorateur, Explorateur, Avant-garde, Sentinelle. Chaque joueur franchit l'arrivée en sortant par le bord du camp adverse.

## Déplacement

À ton tour, sélectionne une de tes pièces et déplace-la. Les pièces se déplacent en ligne droite (avant, arrière, gauche, droite) sur la grille, en dépensant du Mouvement selon le terrain.

- Une pièce peut atteindre n'importe quelle case à portée de son Mouvement et peut changer de direction.
- Tu ne peux traverser aucune pièce, alliée ou ennemie. Tu dois les contourner.
- Tu ne peux pas revenir sur ta case de départ au cours du même tour.
- Après ton déplacement (ou ton attaque), ton tour se termine et c'est à ton adversaire de jouer.

### Coûts de déplacement

- **Plat :** se déplacer vers une case de même hauteur coûte 1 point de Mouvement.
- **Montée et descente :** se déplacer vers une case plus haute ou plus basse coûte la différence de hauteur + 1. Passer de la hauteur 2 à la hauteur 4 coûte 3 ; descendre de la hauteur 4 à la hauteur 2 coûte aussi 3.

### Déplacement spécial de l'Explorateur

À chaque tour, les Explorateurs disposent de deux déplacements spéciaux depuis leur position de départ. Ce sont des coups à part entière, qui ne peuvent pas être combinés avec un déplacement normal.

- **Pas en diagonale :** déplace-toi de 1 case en diagonale, quelle que soit la différence de hauteur.
- **Bond en ligne droite :** saute de 2 cases dans une direction cardinale, quelle que soit la hauteur.

## Combat

Quand une de tes pièces est adjacente à une pièce ennemie, tu peux choisir d'attaquer au lieu de te déplacer vers une case vide. Le combat est résolu instantanément en comparant les forces effectives. Si la force de l'attaquant est supérieure ou égale à celle du défenseur, le défenseur est capturé et retiré de la partie.

Attaquer met fin à ton tour. Tu ne peux plus te déplacer après une attaque. Si une attaque devait échouer (force de l'attaquant < force du défenseur), le coup n'est pas autorisé. Les pièces capturées sont définitivement retirées de la partie.

### Modificateurs de force

- **Descente :** attaquer depuis une position plus haute donne +1 en Force. Attaquer en descente signifie que ta pièce a commencé le tour plus haut que la cible.
- **Montée :** attaquer en montée donne −1 en Force. Attaquer en montée signifie que ta pièce a commencé le tour plus bas que la cible.
- **Alliés :** en attaque, chacune de tes pièces adjacentes à la cible ajoute sa Force de base à l'attaque.
- **Renforts :** en défense, chaque pièce alliée adjacente au défenseur ajoute +1 à la défense.

**Attaquant** = Force + avantage de hauteur + alliés (+ leur Force)
**Défenseur** = Force + renforts (+1 chacun)

### Attaque spéciale de l'Avant-garde

Une Avant-garde gagne +1 en force d'attaque quand elle doit utiliser ses 4 points de Mouvement pour atteindre la cible.

### Exemples

**Avantage de la colline.** L'Avant-garde rouge (Force 2, +1 de hauteur = 3) attaque l'Avant-garde bleue (Force 2, +1 grâce à la Sentinelle adjacente = 3). L'attaquant gagne (3 ≥ 3) : l'Avant-garde bleue est capturée.

**Assaut allié.** L'Explorateur rouge (Force 1, +2 grâce à l'Avant-garde rouge adjacente à la cible = 3) attaque la Sentinelle bleue (Force 3). L'attaquant gagne (3 ≥ 3) : la Sentinelle bleue est capturée.

## Score

Le but ultime du jeu est de faire traverser le plateau à tes pièces pour franchir l'arrivée en passant le bord opposé. Pour cela, une pièce doit se trouver sur la dernière rangée et avoir encore au moins 1 point de Mouvement pour sortir du plateau. Une fois arrivée, la pièce est retirée et sa Force est ajoutée à ton score (Explorateur 1 point, Avant-garde 2, Sentinelle 3). La partie se termine dès que deux pièces au total ont franchi l'arrivée. Elles peuvent appartenir au même joueur ou à des joueurs différents.

- **Victoire standard :** quand la deuxième pièce franchit l'arrivée, le score de chaque joueur est la somme des Forces de ses pièces arrivées. Le score le plus élevé l'emporte. En cas d'égalité, la partie est nulle.
- **Victoire spéciale de la Sentinelle :** si une Sentinelle est la toute première pièce (de l'un ou l'autre joueur) à franchir l'arrivée, ce joueur gagne immédiatement.
- **Limite de coups :** une partie qui atteint 200 coups s'arrête là, et le score le plus élevé l'emporte. Si aucun joueur n'a marqué, la victoire revient au joueur dont la pièce est la plus proche de l'arrivée, en comptant les rangées qu'il lui reste à franchir. Si les pièces les plus avancées des deux joueurs sont aussi proches l'une que l'autre, la plus forte l'emporte. Si elles ont aussi la même Force, la partie est nulle.

## Conseils stratégiques

- **Contrôle les hauteurs.** Les pièces en hauteur gagnent +1 en Force quand elles attaquent en descente, et les ennemis qui les attaquent d'en bas perdent 1. Tiens les lignes de crête sur le chemin de ton adversaire pour dominer le plateau.
- **Le gambit de la Sentinelle.** Faire traverser une Sentinelle en premier donne la victoire immédiate, mais les Sentinelles ont le mouvement le plus faible. Utilise les Explorateurs et les Avant-gardes pour dégager un chemin ou créer des diversions.
- **Défense en formation.** Les renforts adjacents augmentent la force d'un défenseur. Garder tes pièces proches crée un mur défensif difficile à percer. Mais attention : se regrouper ralentit ta progression.
- **La charge de l'Avant-garde.** Place tes Avant-gardes à exactement 4 points de Mouvement d'une cible pour débloquer leur bonus d'attaque de +1. Sur un terrain varié, montées et descentes coûtent plus cher : un dénivelé peut amener un ennemi éloigné à distance de charge.
- **Débordement par l'Explorateur.** Les Explorateurs peuvent se déplacer en diagonale et bondir par-dessus le relief, ce qui les rend idéaux pour déborder l'adversaire. Leur faible force leur impose d'éviter l'affrontement direct avec des pièces plus fortes.

## Précisions appliquées par la version en ligne

Là où la fiche laisse un point ouvert, la version en ligne applique ces choix :

- **Numérotation des rangées.** La fiche numérote les rangées des deux façons. La version en ligne compte de 1 (en bas, camp rouge) à 10 (en haut, camp bleu), comme dans la section Score.
- **Colonnes de départ.** « Colonnes 2 à 7 » est lu en partant de 0 : ce sont les six colonnes centrales, de c à h.
- **Attaque.** Une attaque est un déplacement dont le dernier pas entre sur la case ennemie. Le chemin coûte du Mouvement comme un déplacement normal. L'attaquant prend la place de la pièce capturée.
- **Adjacence.** « Adjacente » veut dire orthogonale (haut, bas, gauche, droite). L'attaquant lui-même ne compte pas parmi ses alliés.
- **Explorateur.** Les déplacements spéciaux peuvent aussi servir à attaquer. Le bond ignore le relief et ce qu'il y a sur la case intermédiaire ; la case d'arrivée doit être libre ou ennemie. On ne peut pas franchir l'arrivée avec un déplacement spécial.
- **Arrivée.** Sortir du plateau est le coup du tour : la pièce rejoint la dernière rangée, puis avance d'une case au-delà du bord, ce qui coûte 1 point de Mouvement. Dans la version en ligne, on clique cette case surlignée hors du plateau.
- **Coups.** Un coup est le tour d'un joueur. La limite est donc de 200 tours au total.
- **Joueur bloqué.** Un joueur qui n'a aucun coup autorisé passe son tour. Si aucun des deux ne peut jouer, la partie s'arrête et se décide comme à la limite de coups.
- **Équité des plateaux.** Le terrain reste entièrement aléatoire. Pour limiter le déséquilibre, des plateaux sont tirés jusqu'à en trouver un dont le déséquilibre ne dépasse pas 0,25 ; après 40 tirages sans y parvenir, le plus équilibré est retenu. En mode « Aléatoire », le type de terrain est tiré une seule fois, avec la même chance pour chacun, avant cet équilibrage. Le déséquilibre se mesure comme l'écart entre les deux camps du coût moyen pour atteindre le milieu du plateau depuis les cases de départ, plus l'écart de hauteur moyenne entre les deux moitiés. Un léger avantage pour l'un des camps reste possible.
- **Modes de terrain.** Ils reposent sur le générateur d'origine (`game.py`). Le mode « Aléatoire » tire l'un des cinq autres.
- **Plateau numéroté.** Chaque plateau porte un numéro. L'adresse `?terrain=<mode>&plateau=<numéro>` redonne exactement le même plateau, pour rejouer une carte ou la reproduire sur une édition physique.
