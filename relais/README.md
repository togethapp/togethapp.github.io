# Relais de l'ancienne adresse de Together

Together a quitté `https://wjrnj9zy72-design.github.io/Code/` pour
`https://togethapp.github.io/`. Ce dossier est le contenu du dépôt
**`wjrnj9zy72-design.github.io`** du compte personnel : GitHub le sert à la
racine de l'ancienne adresse, et — une fois le projet parti — sous `/Code/`
aussi.

- `404.html` (et `index.html`, la même page) : tout ce qu'on demande à
  l'ancienne adresse — un lien de sondage envoyé avant, l'icône de l'app sur
  l'écran d'accueil — arrive ici et repart au même endroit de la nouvelle
  adresse. La première fois, la page emporte ce que le téléphone gardait de
  Together (groupes, clés, droits d'organisateur, documents), que la nouvelle
  adresse ne peut pas lire : dans le lien, après le `#`, la partie d'une
  adresse qui ne quitte jamais le téléphone. L'app le reprend en arrivant
  (`src/move.js` du dépôt de l'app). La session du compte n'est pas emportée :
  on se reconnecte d'un code.
- `Code/sw.js` : remplace l'ancien service worker. Sans lui, un téléphone qui a
  installé l'app continuerait d'ouvrir l'ancienne version gardée en cache.
- `?encore` au bout d'une ancienne adresse renvoie les données une nouvelle
  fois (si le premier envoi n'a pas été repris).

L'adresse d'arrivée est écrite une fois, en tête du script de `404.html` (et
de `index.html`) : `const NEW`. Le dépôt de l'app vérifie ces fichiers
(`tests/relais.test.js`) et en garde la copie de référence dans `relais/`.
