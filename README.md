# Traversal

Jeu de stratégie pour deux joueurs sur un plateau 10×10 **en relief**. Le terrain est généré aléatoirement à chaque partie : aucune ouverture ne peut être apprise par cœur.

**Jouer :** ouvrir `index.html` dans un navigateur (aucune installation), ou la version GitHub Pages du dépôt.

## Règles

- Chaque camp a 6 pièces (S soldat, G garde, M médecin) sur sa rangée du fond. Elles se déplacent toutes de la même façon. Les Noirs commencent.
- Une pièce avance d'une case orthogonale : à hauteur égale, en **montant d'un niveau au plus**, ou en **descendant de deux niveaux au plus**.
- On capture en arrivant sur la case d'une pièce adverse.
- On gagne en capturant toutes les pièces adverses, si l'adversaire n'a plus aucun coup légal, si sa pendule tombe à zéro, ou s'il abandonne.

Le terrain respecte la physique du plateau d'origine : deux cases voisines ne diffèrent jamais de plus de 2 niveaux, et la bordure est à hauteur 0. On peut choisir parmi 14 terrains (montagnes, forêts, vallées, Everest, fosse des Mariannes…). Un **code de plateau** permet de rejouer exactement le même terrain.

## Cadences

Toutes les cadences sont disponibles, au format « minutes | incrément en secondes » :

| Catégorie | Cadences |
|---|---|
| Sans limite | ∞ |
| Bullet | 1\|0, 1\|1, 2\|1 |
| Blitz | 3\|0, 3\|2, 5\|0, 5\|3 |
| Rapide | 10\|0, 10\|5, 15\|10 |
| Classique | 30\|0, 30\|20 |
| Personnalisée | 0,5 à 180 min, incrément de 0 à 180 s |

L'incrément est ajouté après chaque coup joué. La pendule se base sur l'horloge système et ne dérive donc pas.

## Développement

```
game.js     règles et génération du terrain (sans affichage)
clock.js    pendule et cadences
index.html  interface
test.js     tests : node test.js
```

## Crédits

D'après le concept et le générateur de terrain de [darkfireXXI/board_game](https://github.com/darkfireXXI/board_game). Le code de ce dépôt a été entièrement réécrit.
