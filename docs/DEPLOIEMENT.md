# Mettre l'app en ligne, avec parties partagées

À la fin : une adresse web que vous ouvrez depuis n'importe quel téléphone, et
un bouton *Partager* qui donne un lien ouvrant **la même partie** chez quelqu'un
d'autre, avec ses scores, en direct.

**Tout se fait au navigateur.** Pas de terminal, pas de Node.js, rien à
installer — ni sous Windows, ni ailleurs. Comptez une demi-heure.

Deux services, gratuits et sans carte bancaire : **Supabase** garde les parties,
**GitHub Pages** sert l'app.

> Les interfaces de Supabase et de GitHub changent de temps en temps. Si un
> bouton n'est pas là où c'est écrit, cherchez son intitulé : les noms bougent
> moins que les emplacements.

---

## Étape 0 — Fusionner la PR

L'app en ligne est publiée par un automatisme qui vit dans la branche `main`.
Tant que la PR n'est pas fusionnée, `main` contient une vieille version et
l'automatisme n'existe pas.

Sur GitHub, ouvrez la pull request ouverte sur le dépôt, puis
**Merge pull request** → **Confirm merge**.

## Étape 1 — Créer le projet Supabase

Vous êtes connecté à [supabase.com](https://supabase.com) et vous voyez soit une
liste de projets, soit un écran de bienvenue.

1. Cliquez **New project** (en haut à droite, ou au centre s'il n'y en a aucun).
2. Si une organisation vous est demandée, créez-la — n'importe quel nom, le
   vôtre fait l'affaire. C'est juste un dossier.
3. Remplissez :
   - **Name** : `marque-points`
   - **Database Password** : cliquez sur *Generate a password*. **Copiez-le dans
     un endroit sûr** — l'app ne s'en sert pas, mais Supabase ne vous le
     remontrera plus.
   - **Region** : la plus proche de vous (*Central EU (Frankfurt)* ou
     *West EU (Ireland)* depuis la France).
4. **Create new project**, puis patientez une à deux minutes : le projet se
   met en route.

## Étape 2 — Créer la table et les fonctions

> ⚠️ **À passer une fois, et jamais après l'étape 2 bis.** L'étape 2 bis remplace
> deux de ces fonctions par des versions qui demandent une clé de groupe ;
> repasser l'étape 2 par-dessus remettrait les anciennes à côté des nouvelles, et
> la base répondrait `function is not unique` à chaque écriture de l'app. Si cela
> arrive : relancez **le bloc de l'étape 2 bis**, il nettoie et répare.

1. Dans la colonne de gauche, cliquez **SQL Editor** (icône en forme de
   terminal). Puis **New query** si un éditeur vide ne s'ouvre pas tout seul.
2. Collez **tout** le bloc ci-dessous dans la grande zone de texte.
3. Cliquez **Run** en bas à droite (ou Ctrl + Entrée).

```sql
-- La table des parties. Personne n'y touche directement : elle est verrouillée,
-- et seules les trois fonctions ci-dessous sont accessibles depuis l'app.
create table if not exists public.marque_points_games (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.marque_points_games enable row level security;
-- Aucune règle d'accès n'est déclarée : la table est donc inatteignable
-- directement. C'est voulu.

-- Ces trois colonnes ne servent qu'aux lots de parties (étape 2 bis). Elles
-- sont créées ici, et les trois fonctions ci-dessous les respectent dès
-- maintenant, pour que relancer ce bloc plus tard ne puisse jamais défaire la
-- protection des lots. Sans l'étape 2 bis, elles restent vides et ne changent
-- rien.
alter table public.marque_points_games
  add column if not exists code_hash text,
  add column if not exists code_salt text,
  add column if not exists tries integer not null default 0;

-- Lire une partie, à condition d'en connaître l'identifiant exact. Un lot
-- protégé par un code n'est pas lisible ici : il a sa propre fonction.
create or replace function public.marque_points_get(p_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select data from public.marque_points_games
   where id = p_id and code_hash is null;
$$;

-- Écrire une partie, avec deux garde-fous : un identifiant de taille plausible
-- et une partie qui ne dépasse pas 200 Ko.
create or replace function public.marque_points_put(p_id text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or length(p_id) < 8 or length(p_id) > 128 then
    raise exception 'identifiant invalide';
  end if;
  if pg_column_size(p_data) > 200000 then
    raise exception 'partie trop volumineuse';
  end if;

  insert into public.marque_points_games (id, data, updated_at)
  values (p_id, p_data, now())
  on conflict (id) do update
    set data = excluded.data, updated_at = now()
    where marque_points_games.code_hash is null;
end;
$$;

-- Supprimer une partie. Un lot ne s'efface pas ainsi : il se révoque.
create or replace function public.marque_points_delete(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.marque_points_games
   where id = p_id and code_hash is null;
$$;

grant execute on function public.marque_points_get(text) to anon, authenticated;
grant execute on function public.marque_points_put(text, jsonb) to anon, authenticated;
grant execute on function public.marque_points_delete(text) to anon, authenticated;
```

Attendu : **Success. No rows returned.**

Si un message rouge apparaît, c'est que le bloc n'a pas été collé en entier —
recollez-le depuis la première ligne `create table` jusqu'au dernier `grant`.

## Étape 2 bis — Les groupes

Cette étape ajoute les **groupes**, et avec eux tout le partage. Elle est
facultative : sans elle, l'app marche, mais chacun garde ses parties, ses listes
et ses sondages pour lui.

Un **groupe**, c'est un cercle de personnes — la famille, les copains du mardi —
et une **clé**. Qui a la clé :

- voit **tout ce qui est partagé dans le groupe**, parties, listes et sondages
  confondus, d'un seul bouton (*Tout récupérer*) ;
- peut **y partager** à son tour.

Et deux règles qui font le reste :

| | Faut-il une clé ? |
| --- | --- |
| **Commencer** à partager quelque chose | oui, celle d'un groupe |
| **Contribuer** à ce qui est déjà partagé — ajouter une manche, cocher une ligne, répondre | non |
| **Supprimer** quelque chose de partagé | oui, celle de son groupe |

C'est ce qui permet d'envoyer le lien d'une partie à quelqu'un d'extérieur : il
joue avec vous sans rien voir du reste, et sans pouvoir rien partager.

### 1. Le bloc SQL

**SQL Editor** → **New query**, collez **tout** ce bloc, puis **Run**.

> **Votre base existe déjà ?** Pas besoin de recoller ce bloc : ouvrez
> **`supabase/mise-a-jour.sql`** dans le dépôt, bouton **Raw**, copiez **tout**,
> collez dans **SQL Editor → New query**, **Run**. Réponse attendue :
> `Success. No rows returned`.
>
> Il apporte, sans rien effacer, les derniers changements :
>
> - les invitations valent **deux jours** au lieu d'un ;
> - **« Lien seulement »** : un document que seuls ceux qui ont le lien voient,
>   absent des onglets et de l'agenda de vos groupes ;
> - **l'organisateur** : qui crée un sondage garde seul la main sur la date,
>   la clôture, la question, les choix et la suppression ; les autres votent,
>   et peuvent proposer des choix en plus ;
> - **les votes se fondent** au lieu d'être remplacés : une copie en retard
>   n'efface plus ceux arrivés entre-temps ;
> - **ce qui est supprimé ne revient plus** : le téléphone d'un invité qui
>   avait encore le sondage à l'écran le recréait à son coché suivant — et,
>   s'il était d'un autre groupe, le rangeait chez lui ; et un sondage clos ne
>   prend plus de votes.
>
> Sans lui, l'app demande deux jours et la base les ramène à un ; un « lien
> seulement » atterrit dans les onglets du groupe comme n'importe quel autre
> document ; et un sondage créé est partagé **sans organisateur**, donc
> réglable par tous comme avant — l'app s'en rend compte et renvoie sans le
> secret que l'ancienne base ne connaît pas, plutôt que de ne rien partager. On peut le repasser sans danger : il remplace en place. Un
> test vérifie qu'il dit exactement la même chose que le bloc ci-dessous.

```sql
-- ---------------------------------------------------------------------------
-- Les groupes, et les liens qui portent plusieurs choses à la fois.
--
-- Un groupe, c'est un cercle de personnes — la famille, les copains du mardi —
-- et une clé. Qui a la clé appartient au groupe : il voit tout ce qui y est
-- partagé, parties, listes et sondages confondus, et peut y partager à son
-- tour.
--
-- On entre dans un groupe avec **le nom du groupe et six chiffres** : quelqu'un
-- qui en est déjà membre crée l'invitation depuis l'app, l'envoie sous forme de
-- lien (ou la dit de vive voix), et l'app d'en face échange ça contre une clé à
-- elle — propre à cet appareil, étiquetée du prénom de qui entre, et révocable
-- sans toucher aux autres.
--
-- Deux règles, et elles suffisent :
--   * créer un partage demande la clé d'un groupe ;
--   * contribuer à un partage qui existe déjà n'en demande pas — c'est ce qui
--     permet d'envoyer un lien à quelqu'un d'extérieur au groupe et qu'il
--     puisse ajouter une manche ou cocher une ligne, sans rien voir du reste.
--
-- Un lot, en plus, se ferme d'un code à six chiffres : dix essais, puis il se
-- bloque. C'est la façon de faire entrer quelqu'un d'un coup pour une soirée,
-- sans lui donner la clé du groupe.
--
-- Ce bloc se relance sans dommage, autant de fois qu'on veut.
-- ---------------------------------------------------------------------------

-- La version d'avant n'avait qu'une clé, sans groupe : elle s'efface ici.
drop function if exists public.marque_points_new_owner_key();
drop function if exists public.marque_points_new_owner_key(text);
drop function if exists public.marque_points_is_owner(text);
drop function if exists public.marque_points_is_owner(text, text);
drop table if exists public.marque_points_owner;

create table if not exists public.marque_points_group (
  id text primary key,
  name text not null,
  key_hash text,
  key_salt text,
  created_at timestamptz not null default now()
);

alter table public.marque_points_group enable row level security;

-- Un groupe peut exiger un compte : un appareil sans compte n'y voit plus ce
-- qui est partagé, n'y partage plus et n'y invite plus. Il vote encore par un
-- lien, comme un visiteur. C'est la personne qui fait entrer qui le décide.
alter table public.marque_points_group
  add column if not exists accounts_required boolean not null default false;

-- Le nom du canal où la base annonce les changements du groupe (voir « Les
-- changements annoncés aussitôt », plus bas) : tiré au hasard, donné seulement
-- à qui a une clé.
alter table public.marque_points_group
  add column if not exists channel text not null default replace(gen_random_uuid()::text, '-', '');

-- Deux groupes du même nom seraient indiscernables : on entre dans un groupe en
-- disant son nom, et un lien d'invitation ne porte que ce nom. Sur une base qui
-- en aurait déjà deux, l'index n'est pas créé et un message le dit — renommez-en
-- un, puis relancez ce bloc.
do $$
begin
  if exists (
    select 1 from public.marque_points_group
     group by lower(btrim(name)) having count(*) > 1
  ) then
    raise warning 'deux groupes portent le meme nom : renommez-en un, puis relancez ce bloc';
  else
    create unique index if not exists marque_points_group_name
      on public.marque_points_group (lower(btrim(name)));
  end if;
end;
$$;

-- Un groupe a autant de clés que d'appareils entrés : chacune se révoque sans
-- déranger les autres.
create table if not exists public.marque_points_group_key (
  id text primary key,
  group_id text not null references public.marque_points_group(id) on delete cascade,
  label text not null default '',
  key_hash text not null,
  key_salt text not null,
  created_at timestamptz not null default now()
);

alter table public.marque_points_group_key enable row level security;
create index if not exists marque_points_group_key_group on public.marque_points_group_key (group_id);

-- Le compte auquel une clé est rattachée, quand son appareil est connecté
-- (voir « Les comptes », plus bas). Jamais la clé elle-même.
alter table public.marque_points_group_key
  add column if not exists user_id uuid;
create index if not exists marque_points_group_key_user on public.marque_points_group_key (user_id);

-- Toutes les clés voient et partagent ; seules certaines **font entrer**. La clé
-- affichée à la création du groupe admet ; celles distribuées ensuite non. C'est
-- ce qui vous garde portier de votre groupe : une personne que vous acceptez ne
-- peut pas en accepter d'autres à votre place.
alter table public.marque_points_group_key
  add column if not exists admits boolean not null default false;

-- Une base montée avant l'acceptation : une de ses clés doit devenir celle qui
-- admet, sinon plus personne ne pourrait faire entrer qui que ce soit.
--
-- Laquelle : **seulement** celle que l'éditeur SQL a affichée à la création du
-- groupe, qui se reconnaît à son étiquette. Jamais un appareil entré ensuite —
-- ce bloc se relance à volonté, et promouvoir « la plus ancienne clé » finirait
-- par donner votre porte au téléphone de quelqu'un d'autre le jour où la vôtre
-- aurait été supprimée.
update public.marque_points_group_key k
   set admits = true
 where k.label in ('première clé', 'clé refaite')
   and k.id = (select k2.id
                 from public.marque_points_group_key k2
                where k2.group_id = k.group_id
                  and k2.label in ('première clé', 'clé refaite')
                order by k2.created_at, k2.id
                limit 1)
   and not exists (select 1
                     from public.marque_points_group_key k3
                    where k3.group_id = k.group_id and k3.admits);

-- Un groupe dont la clé de création a été supprimée n'a plus personne pour
-- faire entrer, et rien ici ne doit promouvoir l'appareil de quelqu'un d'autre
-- à votre place : on le signale, et c'est à vous de désigner la clé (étape 4).
do $$
declare
  v_orphelins text;
begin
  select string_agg(g.name, ', ') into v_orphelins
    from public.marque_points_group g
   where not exists (select 1 from public.marque_points_group_key k
                      where k.group_id = g.id and k.admits);
  if v_orphelins is not null then
    raise warning 'aucune cle ne fait entrer dans : % — designez-en une (etape 4 du guide)', v_orphelins;
  end if;
end;
$$;

-- Une base montée avant les invitations garde sa clé sur le groupe : elle
-- devient la première clé de ce groupe, et la colonne disparaît. Écrit ainsi
-- pour que **relancer ce bloc** ne bute pas sur une colonne déjà disparue : tout
-- ce bloc doit pouvoir être repassé tel quel, autant de fois que nécessaire.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'marque_points_group'
       and column_name = 'key_hash'
  ) then
    execute $migration$
      insert into public.marque_points_group_key (id, group_id, label, key_hash, key_salt, created_at)
      select replace(gen_random_uuid()::text, '-', ''), g.id, 'première clé', g.key_hash, g.key_salt, g.created_at
        from public.marque_points_group g
       where g.key_hash is not null
         and not exists (select 1 from public.marque_points_group_key k where k.group_id = g.id)
    $migration$;
  end if;
end;
$$;

alter table public.marque_points_group drop column if exists key_hash;
alter table public.marque_points_group drop column if exists key_salt;

-- Les invitations : six chiffres, une durée, et un nombre de demandes. Les deux
-- formes valent une journée ; ce qui les sépare, c'est le nombre de personnes qui
-- peuvent frapper avec — plusieurs, ou une seule. L'une comme l'autre ne donnent
-- que le droit de **frapper** : ce qui fait entrer, c'est votre acceptation.
create table if not exists public.marque_points_invite (
  code text primary key,
  group_id text not null references public.marque_points_group(id) on delete cascade,
  expires_at timestamptz not null,
  uses integer not null default 1,
  tries integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.marque_points_invite enable row level security;

-- Qui a frappé, et qui attend. Une demande porte le prénom donné à l'entrée,
-- l'étiquette de l'appareil, et l'empreinte d'un jeton secret rendu une seule
-- fois à cet appareil. Le jour où vous acceptez, ce jeton **devient** sa clé de
-- groupe : la base n'a donc jamais à garder un secret en clair, et l'appareil
-- n'a rien à venir chercher.
create table if not exists public.marque_points_request (
  id text primary key,
  group_id text not null references public.marque_points_group(id) on delete cascade,
  name text not null default '',
  label text not null default '',
  ticket_hash text not null,
  ticket_salt text not null,
  state text not null default 'waiting',
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

alter table public.marque_points_request enable row level security;
create index if not exists marque_points_request_group
  on public.marque_points_request (group_id, state);

-- Les entrées ratées, par nom de groupe : un vrai code donné avec un autre nom
-- que celui de son groupe. Au-delà de vingt en dix minutes sur un même groupe,
-- on n'y ouvre plus du tout pendant un moment. Un code qui n'existe pas ne se
-- compte nulle part (voir marque_points_ask) : six chiffres ne font que
-- frapper, et ce qui fait entrer, c'est votre acceptation.
create table if not exists public.marque_points_join_miss (
  id bigserial primary key,
  name text not null,
  at timestamptz not null default now()
);

alter table public.marque_points_join_miss enable row level security;
create index if not exists marque_points_join_miss_name on public.marque_points_join_miss (name, at);

-- Une personne, par opposition à un appareil. Un appareil a une clé ; une
-- personne a un **lien de retour** — un jeton durable qui lui rend une clé neuve
-- dans n'importe quel navigateur, sans que personne n'ait à l'accepter de
-- nouveau. C'est ce qui permet de revenir après une réinstallation, ou depuis
-- Safari quand on est entré depuis le navigateur de Messenger.
--
-- Le jeton n'est jamais écrit ici : seule son empreinte salée l'est, comme pour
-- les clés. Et il naît **sur l'appareil de la personne**, qui est le seul à le
-- voir : celui qui fait entrer ne le connaît pas, et ne peut donc pas se faire
-- passer pour elle. Il peut en revanche le **couper**.
create table if not exists public.marque_points_person (
  id text primary key,
  group_id text not null references public.marque_points_group(id) on delete cascade,
  name text not null default '',
  token_hash text,
  token_salt text,
  created_at timestamptz not null default now()
);

alter table public.marque_points_person enable row level security;
create index if not exists marque_points_person_group on public.marque_points_person (group_id);

-- La clé d'un appareil dit de quelle personne il est. Les clés d'avant — la
-- vôtre, celles des appareils entrés autrefois — n'en ont pas, et n'en ont pas
-- besoin : c'est le lien de retour qui en dépend, rien d'autre.
alter table public.marque_points_group_key
  add column if not exists person_id text references public.marque_points_person(id) on delete set null;

-- Les tentatives ratées de retour ne se comptent pas, comme pour l'agenda : un
-- jeton de 128 bits ne se devine pas, et un plafond commun à tout le monde
-- laissait quiconque tapait de faux codes bloquer les liens de retour de tous.

-- Chaque document partagé appartient au groupe qui l'a créé.
alter table public.marque_points_games
  add column if not exists group_id text;

-- « Lien seulement » : un document créé avec la clé d'un groupe — c'est elle
-- qui garde le droit de le supprimer, et qui tient la base à l'abri des
-- inconnus — mais que le groupe ne liste pas. Ni ses onglets, ni son agenda
-- ne le voient : seuls ceux qui ont reçu le lien. Fixé à la première écriture,
-- comme le groupe : quelqu'un qui a le lien ne peut pas le faire apparaître.
alter table public.marque_points_games
  add column if not exists listed boolean not null default true;

-- L'organisateur : qui a créé un sondage garde seul la main sur ce qui le
-- règle — la date retenue, la clôture, la question, les choix, la liste des
-- personnes, sa suppression. Les autres, membres du groupe ou visiteurs d'un
-- lien, votent, s'ajoutent eux-mêmes, ajoutent des choix et retirent ceux
-- qu'ils ont ajoutés ; rien d'autre ne passe. La base ne
-- garde qu'une empreinte du secret de l'organisateur, jamais le secret.
alter table public.marque_points_games
  add column if not exists owner_hash text;

-- Ce qui a été supprimé ne revient pas. Sans cette trace, le téléphone d'un
-- visiteur qui gardait le sondage à l'écran le recréait à son coché suivant —
-- et, s'il avait la clé d'un autre groupe, le rangeait dans celui-là, où tout
-- ce groupe le voyait. Seuls les identifiants sont gardés, rien du contenu.
create table if not exists public.marque_points_gone (
  id text primary key,
  gone_at timestamptz not null default now()
);
alter table public.marque_points_gone enable row level security;

create index if not exists marque_points_games_group on public.marque_points_games (group_id);

-- Crée un groupe et affiche sa clé UNE fois. Ne s'exécute que d'ici, depuis
-- l'éditeur SQL du projet : PostgreSQL accorde sinon l'exécution à tous.
create or replace function public.marque_points_new_group(p_name text)
returns table (nom text, cle text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := replace(gen_random_uuid()::text, '-', '');
  v_salt text := md5(gen_random_uuid()::text);
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_id text;
begin
  if v_name is null then
    raise exception 'donnez un nom au groupe';
  end if;

  insert into public.marque_points_group (id, name)
  values (replace(gen_random_uuid()::text, '-', ''), v_name)
  returning id into v_id;

  insert into public.marque_points_group_key (id, group_id, label, key_hash, key_salt, admits)
  values (replace(gen_random_uuid()::text, '-', ''), v_id, 'première clé', md5(v_key || v_salt), v_salt, true);

  return query select v_name, v_key;
end;
$$;

-- Coupe toutes les clés d'un groupe et en refait une seule : tous les appareils
-- en sortent, ce qui y est partagé reste. C'est le bouton d'alarme ; pour ne
-- faire sortir qu'un appareil, supprimez sa clé dans marque_points_group_key.
create or replace function public.marque_points_new_group_key(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := replace(gen_random_uuid()::text, '-', '');
  v_salt text := md5(gen_random_uuid()::text);
  v_id text;
begin
  select id into v_id from public.marque_points_group
   where lower(btrim(name)) = lower(btrim(coalesce(p_name, '')));
  if v_id is null then
    raise exception 'aucun groupe de ce nom';
  end if;

  delete from public.marque_points_group_key where group_id = v_id;
  insert into public.marque_points_group_key (id, group_id, label, key_hash, key_salt, admits)
  values (replace(gen_random_uuid()::text, '-', ''), v_id, 'clé refaite', md5(v_key || v_salt), v_salt, true);
  return v_key;
end;
$$;

-- Le groupe qu'ouvre cette clé, ou rien. C'est ce que l'app demande quand on
-- colle une clé : elle en affiche le nom, plutôt qu'un simple « acceptée ».
create or replace function public.marque_points_group_of(p_key text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('id', g.id, 'name', g.name, 'admits', k.admits,
                            'accounts', g.accounts_required, 'linked', k.user_id is not null,
                            'channel', g.channel)
    from public.marque_points_group_key k
    join public.marque_points_group g on g.id = k.group_id
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
   limit 1;
$$;

-- Tout ce qui est partagé dans ce groupe : de quoi rattraper un appareil qui
-- vient d'entrer, ou qui a été absent.
create or replace function public.marque_points_group_docs(p_key text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'updatedAt', g.data->'updatedAt')), '[]'::jsonb)
    from public.marque_points_games g
    join public.marque_points_group_key k on k.group_id = g.group_id
    join public.marque_points_group grp on grp.id = k.group_id
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and (not grp.accounts_required or k.user_id is not null)
     and g.code_hash is null
     and g.listed;
$$;

drop function if exists public.marque_points_put(text, jsonb);
drop function if exists public.marque_points_delete(text);
-- Les versions sans organisateur, remplacées ci-dessous : les laisser créerait
-- deux fonctions du même nom, entre lesquelles la base refuserait de choisir.
drop function if exists public.marque_points_put(text, jsonb, text);
drop function if exists public.marque_points_delete(text, text);

-- Deux copies d'un même sondage, fondues case par case : pour chaque case, la
-- réponse la plus récente l'emporte, et une case décochée est une réponse
-- datée comme une autre. C'est la règle de l'app ; la base la suit, pour
-- qu'une copie en retard ne puisse plus effacer les votes arrivés entre-temps.
-- Les réactions et les mots d'un sondage se fondent de même. Ce qui n'est pas
-- un ensemble de cases ne compte pour rien, et une heure illisible pour zéro.
create or replace function public.marque_points_merge_votes(p_stored jsonb, p_incoming jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(jsonb_object_agg(cells.key,
           case
             when cells.incoming is null then cells.stored
             when cells.stored is null then cells.incoming
             when (case when jsonb_typeof(cells.incoming->'at') = 'number' then (cells.incoming->>'at')::numeric else 0 end)
                  >= (case when jsonb_typeof(cells.stored->'at') = 'number' then (cells.stored->>'at')::numeric else 0 end)
               then cells.incoming
             else cells.stored
           end), '{}'::jsonb)
    from (
      select coalesce(s.key, i.key) as key, s.value as stored, i.value as incoming
        from jsonb_each(case when jsonb_typeof(p_stored) = 'object' then p_stored else '{}'::jsonb end) s
        full join jsonb_each(case when jsonb_typeof(p_incoming) = 'object' then p_incoming else '{}'::jsonb end) i
          on s.key = i.key
    ) cells;
$$;

-- Les choix d'un sondage, augmentés de ceux d'une autre copie : ceux qui
-- manquent s'ajoutent à la suite, sauf s'ils ont été supprimés. Rien n'est
-- retiré ni renommé ; un choix mal formé est ignoré, pour ne pas rendre le
-- sondage illisible dans l'app.
create or replace function public.marque_points_add_options(p_kept jsonb, p_more jsonb, p_removed jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select (case when jsonb_typeof(p_kept) = 'array' then p_kept else '[]'::jsonb end)
         || coalesce((
           select jsonb_agg(n.value order by n.ord)
             from jsonb_array_elements(case when jsonb_typeof(p_more) = 'array' then p_more else '[]'::jsonb end)
                  with ordinality n(value, ord)
            where jsonb_typeof(n.value->'id') = 'string'
              and jsonb_typeof(n.value->'text') = 'string'
              and not coalesce(p_removed, '{}'::jsonb) ? (n.value->>'id')
              and not exists (
                select 1 from jsonb_array_elements(case when jsonb_typeof(p_kept) = 'array' then p_kept else '[]'::jsonb end) o
                 where o.value->>'id' = n.value->>'id')
         ), '[]'::jsonb);
$$;

create or replace function public.marque_points_put(
  p_id text,
  p_data jsonb,
  p_key text default null,
  p_owner text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stored jsonb;
  v_owner text;
  v_group text;
  v_unlock jsonb;
  v_drop jsonb;
  v_next jsonb;
begin
  if p_id is null or length(p_id) < 8 or length(p_id) > 128 then
    raise exception 'identifiant invalide';
  end if;
  if pg_column_size(p_data) > 200000 then
    raise exception 'donnee trop volumineuse';
  end if;
  -- Les secrets qui prouvent qu'un choix retiré était bien le sien : lus
  -- ci-dessous, gardés nulle part.
  v_unlock := p_data->'unlock';
  p_data := p_data - 'unlock';

  select data, owner_hash into v_stored, v_owner
    from public.marque_points_games
   where id = p_id and code_hash is null;

  -- FOUND, et non une variable remplie par la requête : quand aucune ligne ne
  -- revient, SELECT … INTO met toutes ses variables à NULL, la témoin comprise.
  if not found then
    -- Supprimé : on ne le recrée pas, ni ici ni ailleurs. L'app qui l'avait
    -- encore le retire de son côté en lisant cette réponse.
    if exists (select 1 from public.marque_points_gone where id = p_id) then
      raise exception 'document supprime';
    end if;

    -- Rien sous cet identifiant : c'est un partage qui commence, donc il faut
    -- dire dans quel groupe.
    select k.group_id into v_group
      from public.marque_points_group_key k
      join public.marque_points_group grp on grp.id = k.group_id
     where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
       and (not grp.accounts_required or k.user_id is not null);
    if v_group is null then
      raise exception 'cle de groupe invalide';
    end if;

    insert into public.marque_points_games (id, data, updated_at, group_id, listed, owner_hash)
    values (p_id, p_data, now(), v_group,
            not coalesce((p_data->>'linkOnly')::boolean, false),
            case when p_owner is not null and length(p_owner) >= 16 then md5(p_owner || p_id) end);
    return;
  end if;

  -- La ligne existe : qui a le lien peut y contribuer — entièrement si rien
  -- n'a d'organisateur ou si c'est lui qui écrit…
  if v_owner is null or md5(coalesce(p_owner, '') || p_id) = v_owner then
    if v_stored->>'kind' = 'poll' and p_data->>'kind' = 'poll' then
      -- …mais un sondage se fond, il ne se remplace pas : la copie qui arrive
      -- peut ignorer un vote arrivé entre-temps, et l'écraser le perdrait.
      -- Les personnes suivent la copie qui y a touché en dernier, comme dans
      -- l'app. Un choix ajouté entre-temps par un visiteur reste, à moins que
      -- la copie qui arrive ne l'ait supprimé.
      p_data := p_data || jsonb_build_object(
        'votes', public.marque_points_merge_votes(v_stored->'votes', p_data->'votes'),
        'reacts', public.marque_points_merge_votes(v_stored->'reacts', p_data->'reacts'),
        'comments', public.marque_points_merge_votes(v_stored->'comments', p_data->'comments'),
        'options', public.marque_points_add_options(p_data->'options', v_stored->'options',
                     coalesce(v_stored->'removed', '{}'::jsonb) || coalesce(p_data->'removed', '{}'::jsonb)),
        'people', case
                    when coalesce((p_data->>'peopleAt')::numeric, 0) >= coalesce((v_stored->>'peopleAt')::numeric, 0)
                      then coalesce(p_data->'people', '[]'::jsonb)
                    else coalesce(v_stored->'people', '[]'::jsonb)
                  end,
        'peopleAt', greatest(coalesce((v_stored->>'peopleAt')::numeric, 0),
                             coalesce((p_data->>'peopleAt')::numeric, 0)),
        'updatedAt', greatest(coalesce((v_stored->>'updatedAt')::numeric, 0),
                              coalesce((p_data->>'updatedAt')::numeric, 0)));
    end if;
    update public.marque_points_games
       set data = p_data, updated_at = now()
     where id = p_id and code_hash is null;
    return;
  end if;

  -- …et sinon, seulement en votant. Tout le reste est repris tel qu'il était :
  -- la date, la clôture, la question. Les personnes et les choix ne peuvent
  -- que s'ajouter — ceux qui y sont gardent leur nom, et personne n'en retire.
  -- Les réactions et les mots, eux, se fondent toujours, clos ou pas.
  if v_stored->>'kind' is distinct from 'poll' then
    return; -- un organisateur ne se pose que sur un sondage ; rien d'autre à céder
  end if;
  if coalesce(v_stored->>'closedAt', '') <> '' then
    -- Clos : les votes sont arrêtés, pour l'app comme pour la base ; on réagit
    -- encore à un événement, et on y laisse un mot.
    v_next := v_stored || jsonb_build_object(
      'reacts', public.marque_points_merge_votes(v_stored->'reacts', p_data->'reacts'),
      'comments', public.marque_points_merge_votes(v_stored->'comments', p_data->'comments'),
      'updatedAt', greatest(coalesce((v_stored->>'updatedAt')::numeric, 0),
                            coalesce((p_data->>'updatedAt')::numeric, 0)));
    if v_next = v_stored then
      return;
    end if;
    if pg_column_size(v_next) > 200000 then
      raise exception 'donnee trop volumineuse';
    end if;
    update public.marque_points_games
       set data = v_next, updated_at = now()
     where id = p_id and code_hash is null;
    return;
  end if;

  -- Un choix qu'il a lui-même ajouté, il peut le retirer : il en montre le
  -- secret, dont le choix porte l'empreinte (by). Les autres restent.
  select coalesce(jsonb_object_agg(o.value->>'id', (extract(epoch from now()) * 1000)::bigint), '{}'::jsonb)
    into v_drop
    from jsonb_array_elements(case when jsonb_typeof(v_stored->'options') = 'array'
                                   then v_stored->'options' else '[]'::jsonb end) o
   where jsonb_typeof(v_unlock) = 'object'
     and jsonb_typeof(o.value->'by') = 'string'
     and jsonb_typeof(v_unlock->(o.value->>'id')) = 'string'
     and encode(sha256(convert_to(v_unlock->>(o.value->>'id'), 'UTF8')), 'hex') = o.value->>'by';

  v_next := v_stored
           || jsonb_build_object(
                'votes', (select coalesce(jsonb_object_agg(c.key, c.value), '{}'::jsonb)
                            from jsonb_each(public.marque_points_merge_votes(v_stored->'votes', p_data->'votes')) c
                           where not v_drop ? split_part(c.key, '|', 2)),
                'reacts', public.marque_points_merge_votes(v_stored->'reacts', p_data->'reacts'),
                'comments', public.marque_points_merge_votes(v_stored->'comments', p_data->'comments'),
                'removed', (case when jsonb_typeof(v_stored->'removed') = 'object'
                                 then v_stored->'removed' else '{}'::jsonb end) || v_drop,
                'people', coalesce(v_stored->'people', '[]'::jsonb) || coalesce((
                  select jsonb_agg(n.value)
                    from jsonb_array_elements(coalesce(p_data->'people', '[]'::jsonb)) n
                   where not exists (
                     select 1 from jsonb_array_elements(coalesce(v_stored->'people', '[]'::jsonb)) o
                      where o.value->>'id' = n.value->>'id')
                ), '[]'::jsonb),
                'options', public.marque_points_add_options(
                             (select coalesce(jsonb_agg(o.value order by o.ord), '[]'::jsonb)
                                from jsonb_array_elements(case when jsonb_typeof(v_stored->'options') = 'array'
                                                               then v_stored->'options' else '[]'::jsonb end)
                                     with ordinality o(value, ord)
                               where not v_drop ? (o.value->>'id')),
                             p_data->'options',
                             coalesce(v_stored->'removed', '{}'::jsonb) || v_drop),
                'peopleAt', greatest(coalesce((v_stored->>'peopleAt')::numeric, 0),
                                     coalesce((p_data->>'peopleAt')::numeric, 0)),
                'updatedAt', greatest(coalesce((v_stored->>'updatedAt')::numeric, 0),
                                      coalesce((p_data->>'updatedAt')::numeric, 0)));
  -- Ce qu'apporte un visiteur s'ajoute à ce qui est là : la limite vaut pour
  -- le tout, sinon des envois répétés enfleraient le sondage sans fin, jusqu'à
  -- ce que son organisateur lui-même ne puisse plus l'enregistrer.
  if pg_column_size(v_next) > 200000 then
    raise exception 'donnee trop volumineuse';
  end if;

  update public.marque_points_games
     set data = v_next, updated_at = now()
   where id = p_id and code_hash is null;
end;
$$;

-- Supprimer ce qui est partagé demande la clé du groupe : sinon, quiconque a
-- reçu un lien pourrait effacer la partie de tout le monde.
create or replace function public.marque_points_delete(
  p_id text,
  p_key text default null,
  p_owner text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_owner text;
begin
  select group_id, owner_hash into v_group, v_owner from public.marque_points_games
   where id = p_id and code_hash is null;
  if not found then
    return; -- rien à supprimer, rien à refuser
  end if;

  -- Dans un groupe qui exige un compte, une clé sans compte n'y efface plus rien.
  if v_group is null or v_group is distinct from (
    select k.group_id from public.marque_points_group_key k
      join public.marque_points_group grp on grp.id = k.group_id
     where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
       and (not grp.accounts_required or k.user_id is not null)
  ) then
    raise exception 'cle de groupe invalide';
  end if;

  -- Un sondage qui a un organisateur ne se supprime que de sa main : la clé du
  -- groupe, que tous les membres ont, n'y suffit pas.
  if v_owner is not null and md5(coalesce(p_owner, '') || p_id) is distinct from v_owner then
    raise exception 'reserve a l''organisateur';
  end if;

  delete from public.marque_points_games where id = p_id and code_hash is null;
  insert into public.marque_points_gone (id) values (p_id) on conflict (id) do nothing;
end;
$$;

-- Un lot : la clé d'un groupe suffit (avec un compte, si le groupe en exige
-- un), et il se range dans ce groupe.
create or replace function public.marque_points_put_set(
  p_id text, p_data jsonb, p_code text, p_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salt text := md5(gen_random_uuid()::text);
  v_group text;
begin
  select k.group_id into v_group from public.marque_points_group_key k
    join public.marque_points_group grp on grp.id = k.group_id
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and (not grp.accounts_required or k.user_id is not null);
  if v_group is null then
    raise exception 'cle de groupe invalide';
  end if;
  if p_id is null or length(p_id) < 8 or length(p_id) > 128 then
    raise exception 'identifiant invalide';
  end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then
    raise exception 'code invalide';
  end if;
  if pg_column_size(p_data) > 200000 then
    raise exception 'lot trop volumineux';
  end if;

  insert into public.marque_points_games (id, data, updated_at, code_hash, code_salt, tries, group_id)
  values (p_id, p_data, now(), md5(p_code || v_salt), v_salt, 0, v_group);
end;
$$;

-- Retirer un lot : avec une clé de son groupe, pas de n'importe lequel. Un lot
-- d'avant les groupes n'en a pas : n'importe quelle clé le retire, comme avant.
create or replace function public.marque_points_forget_set(p_id text, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
begin
  select k.group_id into v_group from public.marque_points_group_key k
    join public.marque_points_group grp on grp.id = k.group_id
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and (not grp.accounts_required or k.user_id is not null);
  if v_group is null then
    raise exception 'cle de groupe invalide';
  end if;

  delete from public.marque_points_games
   where id = p_id and code_hash is not null
     and (group_id is null or group_id = v_group);
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Ouvrir un lot : dix essais en tout, et le compteur repart à zéro dès qu'un
-- code juste est donné. C'est ce plafond qui rend six chiffres suffisants.
create or replace function public.marque_points_open_set(p_id text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.marque_points_games;
begin
  select * into v_row from public.marque_points_games
   where id = p_id and code_hash is not null;

  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  if v_row.tries >= 10 then
    return jsonb_build_object('status', 'locked');
  end if;
  if v_row.code_hash <> md5(coalesce(p_code, '') || v_row.code_salt) then
    update public.marque_points_games set tries = tries + 1 where id = p_id;
    return jsonb_build_object('status', 'wrong', 'left', 9 - v_row.tries);
  end if;

  update public.marque_points_games set tries = 0 where id = p_id;
  return jsonb_build_object('status', 'ok', 'set', v_row.data);
end;
$$;

-- Six chiffres tirés au hasard, sans reprendre un code encore vivant.
create or replace function public.marque_points_fresh_code()
returns text
language plpgsql
as $$
declare
  v_code text;
begin
  loop
    v_code := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint
                     + 4294967296) % 1000000)::text, 6, '0');
    exit when not exists (select 1 from public.marque_points_invite where code = v_code);
  end loop;
  return v_code;
end;
$$;

-- Inviter : il faut déjà être dans le groupe. Le lien ouvert (une journée,
-- plusieurs personnes) et l'invitation pour une seule personne sont la même
-- fonction, à deux réglages près.
--
-- L'ancienne version de cette étape avait une fonction « entrer » qui rendait
-- une clé sur-le-champ. Elle disparaît : la garder laisserait un chemin pour
-- entrer sans être accepté.
drop function if exists public.marque_points_join(text, text, text);
drop function if exists public.marque_points_invite(text, integer);

-- Et les versions à deux arguments de l'étape 2, que cette étape remplace par
-- des versions qui demandent une clé. Les laisser en place rendrait l'appel
-- ambigu pour la base (« function is not unique ») et l'app cesserait d'écrire :
-- c'est ce qui arrive si l'étape 2 est repassée après celle-ci, et relancer ce
-- bloc répare.
drop function if exists public.marque_points_put(text, jsonb);
drop function if exists public.marque_points_delete(text);

create or replace function public.marque_points_invite(
  p_key text,
  p_minutes integer default 30,
  p_uses integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_name text;
  v_code text;
  -- Deux jours au plus : un lien envoyé le soir doit survivre à quelqu'un qui
  -- lit ses messages le lendemain soir, et un lien retrouvé la semaine d'après
  -- doit être mort.
  v_minutes integer := greatest(5, least(coalesce(p_minutes, 30), 2880));
  v_uses integer := greatest(1, least(coalesce(p_uses, 1), 200));
begin
  select g.id, g.name into v_group, v_name
    from public.marque_points_group_key k
    join public.marque_points_group g on g.id = k.group_id
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and (not g.accounts_required or k.user_id is not null);
  if v_group is null then
    raise exception 'cle de groupe invalide';
  end if;

  -- Ménage : ce qui est mort ne doit pas occuper un code.
  delete from public.marque_points_invite
   where expires_at < now() or uses <= 0;

  v_code := public.marque_points_fresh_code();
  insert into public.marque_points_invite (code, group_id, expires_at, uses)
  values (v_code, v_group, now() + make_interval(mins => v_minutes), v_uses);

  return jsonb_build_object('code', v_code, 'name', v_name, 'minutes', v_minutes, 'uses', v_uses);
end;
$$;

-- Frapper à la porte : le nom du groupe, le code, et le prénom de qui demande.
-- Aucune clé n'est rendue — seulement un jeton, que cet appareil garde et qui
-- deviendra sa clé si vous acceptez. D'ici là il ne voit rien.
create or replace function public.marque_points_ask(
  p_name text,
  p_code text,
  p_who text default '',
  p_label text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.marque_points_invite;
  v_name text := left(lower(btrim(coalesce(p_name, ''))), 60);
  v_ticket text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_salt text := md5(gen_random_uuid()::text);
  v_bucket text;
  v_misses integer;
  v_waiting integer;
begin
  delete from public.marque_points_join_miss where at < now() - interval '1 hour';
  -- Une demande sans réponse finit par s'effacer, et une réponse finit par être
  -- lue : sans ce ménage la liste des demandes deviendrait un dépotoir.
  delete from public.marque_points_request
   where (state = 'waiting' and created_at < now() - interval '7 days')
      or (state <> 'waiting' and answered_at < now() - interval '1 day');

  -- Le code d'abord, le nom ensuite. Chercher par les deux à la fois amenait à
  -- compter les essais ratés sous le nom *fourni* : il suffisait d'en inventer
  -- un différent à chaque fois pour n'être jamais compté, et de faire fermer
  -- l'invitation de tout le monde au bout de dix essais.
  select i.* into v_invite
    from public.marque_points_invite i
   where i.code = coalesce(p_code, '')
     and i.expires_at > now()
     and i.uses > 0;

  -- Un code qui n'existe pas ne se compte nulle part, et reçoit la même réponse
  -- qu'un vrai code donné avec un faux nom. Les compter dans un seau commun
  -- disait, le seau plein, quels codes existaient (« occupé » pour les faux,
  -- autre chose pour les vrais), et laissait quiconque tapait des codes au
  -- hasard bloquer les liens de retour de tout le monde.
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;

  -- Un vrai code dont le nom de groupe est faux se compte sur ce groupe, qui
  -- existe vraiment.
  select left(lower(btrim(g.name)), 60) into v_bucket
    from public.marque_points_group g where g.id = v_invite.group_id;

  select count(*) into v_misses
    from public.marque_points_join_miss
   where name = v_bucket and at > now() - interval '10 minutes';
  if v_misses >= 20 then
    return jsonb_build_object('status', 'busy');
  end if;

  if v_bucket is distinct from v_name then
    -- Le nom ne va pas avec le code. Compté sur le groupe visé, et l'invitation
    -- n'en souffre pas : la fermer ici serait offrir à quiconque a lu le lien
    -- le moyen de la rendre inutilisable pour tous les autres.
    insert into public.marque_points_join_miss (name) values (v_bucket);
    return jsonb_build_object('status', 'unknown');
  end if;

  -- Personne ne doit pouvoir vous noyer sous les demandes.
  select count(*) into v_waiting
    from public.marque_points_request
   where group_id = v_invite.group_id and state = 'waiting';
  if v_waiting >= 50 then
    return jsonb_build_object('status', 'busy');
  end if;

  insert into public.marque_points_request (id, group_id, name, label, ticket_hash, ticket_salt)
  values (replace(gen_random_uuid()::text, '-', ''), v_invite.group_id,
          left(coalesce(btrim(p_who), ''), 24), left(coalesce(btrim(p_label), ''), 80),
          md5(v_ticket || v_salt), v_salt);

  update public.marque_points_invite set uses = uses - 1 where code = v_invite.code;
  delete from public.marque_points_invite where uses <= 0;
  delete from public.marque_points_join_miss where name = v_bucket;

  return jsonb_build_object(
    'status', 'waiting',
    'ticket', v_ticket,
    'id', v_invite.group_id,
    'name', (select name from public.marque_points_group where id = v_invite.group_id)
  );
end;
$$;

-- « Alors, on m'a accepté ? » L'appareil qui attend demande avec son jeton.
-- Accepté, ce jeton est désormais sa clé de groupe : il n'a rien à recevoir.
create or replace function public.marque_points_claim(p_ticket text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.marque_points_request;
begin
  select r.* into v_request
    from public.marque_points_request r
   where r.ticket_hash = md5(coalesce(p_ticket, '') || r.ticket_salt);

  if not found then
    -- La demande a pu être effacée après coup ; si le jeton ouvre le groupe,
    -- c'est qu'il a été accepté, et cela vaut réponse.
    if exists (select 1 from public.marque_points_group_key k
                where k.key_hash = md5(coalesce(p_ticket, '') || k.key_salt)) then
      return (select jsonb_build_object('status', 'ok', 'id', g.id, 'name', g.name)
                from public.marque_points_group_key k
                join public.marque_points_group g on g.id = k.group_id
               where k.key_hash = md5(coalesce(p_ticket, '') || k.key_salt)
               limit 1);
    end if;
    return jsonb_build_object('status', 'unknown');
  end if;

  if v_request.state = 'waiting' then
    return jsonb_build_object('status', 'waiting',
      'name', (select name from public.marque_points_group where id = v_request.group_id));
  end if;
  if v_request.state = 'refused' then
    return jsonb_build_object('status', 'refused');
  end if;

  return jsonb_build_object('status', 'ok', 'id', v_request.group_id,
    'name', (select name from public.marque_points_group where id = v_request.group_id));
end;
$$;

-- Les demandes en attente, pour la clé qui admet. Une clé ordinaire n'a rien à
-- voir ici : elle ne fait pas entrer.
create or replace function public.marque_points_requests(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
begin
  select k.group_id into v_group
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and k.admits;
  if v_group is null then
    raise exception 'cette cle ne fait pas entrer';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'name', r.name, 'label', r.label,
             'at', (extract(epoch from r.created_at) * 1000)::bigint)
           order by r.created_at)
      from public.marque_points_request r
     where r.group_id = v_group and r.state = 'waiting'
  ), '[]'::jsonb);
end;
$$;

-- Accepter, ou refuser. Accepter crée la clé de cet appareil à partir de
-- l'empreinte de son jeton : rien n'a eu à circuler en clair.
create or replace function public.marque_points_answer(p_key text, p_id text, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_person text;
  v_request public.marque_points_request;
begin
  select k.group_id into v_group
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and k.admits;
  if v_group is null then
    raise exception 'cette cle ne fait pas entrer';
  end if;

  -- Verrouillée le temps de répondre : deux acceptations qui se croisent — deux
  -- onglets, ou deux appareils qui font entrer — créaient sinon deux clés pour
  -- la même demande, et couper l'appareil n'en retirait qu'une.
  select r.* into v_request
    from public.marque_points_request r
   where r.id = coalesce(p_id, '') and r.group_id = v_group and r.state = 'waiting'
     for update;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;

  if not coalesce(p_accept, false) then
    update public.marque_points_request
       set state = 'refused', answered_at = now()
     where id = v_request.id and state = 'waiting';
    return jsonb_build_object('status', 'refused');
  end if;

  -- Accepter, c'est faire entrer une **personne** : elle a une ligne à elle, à
  -- laquelle cet appareil — et ceux qu'elle ajoutera plus tard avec son lien de
  -- retour — sont rattachés.
  insert into public.marque_points_person (id, group_id, name)
  values (replace(gen_random_uuid()::text, '-', ''), v_group, left(coalesce(btrim(v_request.name), ''), 24))
  returning id into v_person;

  insert into public.marque_points_group_key (id, group_id, label, key_hash, key_salt, admits, person_id)
  values (replace(gen_random_uuid()::text, '-', ''), v_group,
          left(btrim(coalesce(v_request.name, '') || ' · ' || coalesce(v_request.label, '')), 80),
          v_request.ticket_hash, v_request.ticket_salt, false, v_person);

  update public.marque_points_request
     set state = 'ok', answered_at = now()
   where id = v_request.id and state = 'waiting';

  return jsonb_build_object('status', 'ok');
end;
$$;

-- Le lien de retour de cet appareil, tiré par lui-même : la personne à qui il
-- appartient reçoit un jeton neuf, rendu **une seule fois, ici**. Celui qui fait
-- entrer ne le voit jamais — il naît sur l'appareil de la personne. En tirer un
-- nouveau remplace l'ancien, qui cesse aussitôt de servir.
create or replace function public.marque_points_my_link(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text;
  -- 32 caractères, soit 128 bits : autant que les clés, et assez court pour que
  -- le lien tienne dans un QR code que l'encodeur de l'app sait produire.
  v_token text := replace(gen_random_uuid()::text, '-', '');
  v_salt text := md5(gen_random_uuid()::text);
begin
  select k.person_id into v_person
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt);
  if v_person is null then
    -- Une clé sans personne : la vôtre, ou une clé d'avant les personnes. Elle
    -- n'a pas de lien de retour, et n'en a pas besoin : elle se recolle.
    return jsonb_build_object('status', 'none');
  end if;

  update public.marque_points_person
     set token_hash = md5(v_token || v_salt), token_salt = v_salt
   where id = v_person;

  return jsonb_build_object('status', 'ok', 'token', v_token,
    'name', (select name from public.marque_points_person where id = v_person));
end;
$$;

-- Revenir avec son lien de retour : une clé neuve pour cet appareil-ci,
-- rattachée à la même personne. Aucune acceptation à demander — c'est tout
-- l'objet — et le jeton reste valable pour la fois suivante.
create or replace function public.marque_points_return(p_token text, p_label text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person public.marque_points_person;
  v_key text := replace(gen_random_uuid()::text, '-', '');
  v_salt text := md5(gen_random_uuid()::text);
begin
  -- Pas de plafond d'essais : voir la table des personnes, plus haut.
  select p.* into v_person
    from public.marque_points_person p
   where p.token_hash is not null
     and p.token_hash = md5(coalesce(p_token, '') || p.token_salt);

  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;

  insert into public.marque_points_group_key (id, group_id, label, key_hash, key_salt, admits, person_id)
  values (replace(gen_random_uuid()::text, '-', ''), v_person.group_id,
          left(btrim(coalesce(v_person.name, '') || ' · ' || coalesce(btrim(p_label), '')), 80),
          md5(v_key || v_salt), v_salt, false, v_person.id);

  return jsonb_build_object('status', 'ok', 'key', v_key, 'who', v_person.name,
    'id', v_person.group_id,
    'name', (select name from public.marque_points_group where id = v_person.group_id));
end;
$$;

-- Couper le lien de retour d'une personne, pour la clé qui admet : le lien
-- envoyé cesse de servir. Ce qu'elle a déjà sur ses appareils y reste, et ses
-- clés se coupent une par une comme avant.
create or replace function public.marque_points_forget_link(p_key text, p_person text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
begin
  select k.group_id into v_group
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and k.admits;
  if v_group is null then
    raise exception 'cette cle ne fait pas entrer';
  end if;

  update public.marque_points_person
     set token_hash = null, token_salt = null
   where id = coalesce(p_person, '') and group_id = v_group;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Une personne qui n'a plus aucun appareil dans le groupe n'a plus de lien de
-- retour : coupée depuis l'app, d'ici à la main, ou mise dehors avec tout le
-- monde par le bouton d'alarme, elle ne revient pas d'elle-même, sans que
-- personne ne l'accepte.
create or replace function public.marque_points_person_out()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.person_id is not null
     and not exists (select 1 from public.marque_points_group_key k where k.person_id = old.person_id) then
    update public.marque_points_person set token_hash = null, token_salt = null where id = old.person_id;
  end if;
  return old;
end;
$$;

drop trigger if exists marque_points_person_out on public.marque_points_group_key;
create trigger marque_points_person_out
  after delete on public.marque_points_group_key
  for each row execute function public.marque_points_person_out();

-- Qui est dans le groupe : une ligne par appareil, pour la clé qui admet. La
-- ligne de l'appareil qui demande est signalée, pour qu'il ne se coupe pas
-- lui-même sans le savoir.
-- ----------------------------------------------------------------- agenda ---
-- L'agenda du groupe : une adresse à laquelle les agendas s'abonnent.
--
-- Un jeton par groupe, tiré à la demande et révocable. Qui tient l'adresse voit
-- ce que le groupe a mis sur un jour — et rien d'autre : ni les scores, ni qui
-- a coché quoi, ni aucune clé. C'est une adresse à partager en famille, pas à
-- publier.
alter table public.marque_points_group add column if not exists calendar text;

create unique index if not exists marque_points_group_calendar
  on public.marque_points_group (calendar) where calendar is not null;

-- Le jeton de ce groupe, fabriqué la première fois qu'on le demande. N'importe
-- quelle clé du groupe peut l'obtenir : l'agenda est celui de tout le monde —
-- sauf, dans un groupe qui exige un compte, une clé sans compte : l'agenda
-- montre ce que le groupe partage.
create or replace function public.marque_points_calendar(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_open boolean;
  v_token text;
begin
  select k.group_id, (not grp.accounts_required or k.user_id is not null) into v_group, v_open
    from public.marque_points_group_key k
    join public.marque_points_group grp on grp.id = k.group_id
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt);
  if v_group is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  if not v_open then
    return jsonb_build_object('status', 'account');
  end if;

  select g.calendar into v_token from public.marque_points_group g where g.id = v_group;
  if v_token is null then
    v_token := replace(gen_random_uuid()::text, '-', '');
    update public.marque_points_group set calendar = v_token where id = v_group;
  end if;

  return jsonb_build_object('status', 'ok', 'token', v_token,
    'name', (select name from public.marque_points_group where id = v_group));
end;
$$;

-- Couper l'adresse : les agendas déjà abonnés cessent de recevoir quoi que ce
-- soit. En redemander une en fabrique une autre, sans rapport avec l'ancienne.
-- C'est l'affaire d'une clé qui fait entrer : sinon n'importe quel appareil
-- couperait l'agenda de tout le groupe.
create or replace function public.marque_points_forget_calendar(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
begin
  select k.group_id into v_group
    from public.marque_points_group_key k
    join public.marque_points_group grp on grp.id = k.group_id
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and k.admits
     and (not grp.accounts_required or k.user_id is not null);
  if v_group is null then
    return jsonb_build_object('status', 'unknown');
  end if;

  update public.marque_points_group set calendar = null where id = v_group;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Ce que la fonction « agenda » lit pour écrire le fichier .ics : les listes et
-- les sondages de ce groupe, et rien de plus. Les parties n'ont pas de date à
-- donner, et n'ont donc rien à faire ici.
--
-- Pas de plafond d'essais : un jeton de trente-deux caractères tirés au hasard
-- ne se devine pas, et un plafond commun à tous les groupes laissait quelques
-- agendas abonnés à une adresse coupée faire taire ceux de tout le monde.
create or replace function public.marque_points_agenda(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.marque_points_group;
begin
  select g.* into v_group
    from public.marque_points_group g
   where g.calendar is not null and g.calendar = coalesce(p_token, '');

  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'name', v_group.name,
    'docs', coalesce((
      select jsonb_agg(g.data)
        from public.marque_points_games g
       where g.group_id = v_group.id
         and g.code_hash is null
         and g.listed
         and g.data->>'kind' in ('list', 'poll')
    ), '[]'::jsonb));
end;
$$;

grant execute on function public.marque_points_calendar(text) to anon, authenticated;
grant execute on function public.marque_points_forget_calendar(text) to anon, authenticated;
grant execute on function public.marque_points_agenda(text) to anon, authenticated;

create or replace function public.marque_points_group_keys(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
begin
  select k.group_id into v_group
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and k.admits;
  if v_group is null then
    raise exception 'cette cle ne fait pas entrer';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', k.id, 'label', k.label, 'admits', k.admits,
             'mine', k.key_hash = md5(coalesce(p_key, '') || k.key_salt),
             'person', k.person_id,
             'who', (select p.name from public.marque_points_person p where p.id = k.person_id),
             'link', (select p.token_hash is not null from public.marque_points_person p where p.id = k.person_id),
             'account', k.user_id is not null,
             'at', (extract(epoch from k.created_at) * 1000)::bigint)
           order by k.created_at)
      from public.marque_points_group_key k
     where k.group_id = v_group
  ), '[]'::jsonb);
end;
$$;

-- Désigner l'appareil qui fait entrer, depuis l'app plutôt que d'ici. Il faut
-- déjà faire entrer soi-même pour l'accorder ou le retirer — sinon n'importe quel
-- appareil se donnerait la porte — et la dernière clé qui admet ne se retire pas.
create or replace function public.marque_points_set_admits(p_key text, p_id text, p_allow boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_admits boolean;
  v_left integer;
begin
  select k.group_id into v_group
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and k.admits;
  if v_group is null then
    raise exception 'cette cle ne fait pas entrer';
  end if;

  select k.admits into v_admits
    from public.marque_points_group_key k
   where k.id = coalesce(p_id, '') and k.group_id = v_group
     for update;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  if v_admits = coalesce(p_allow, false) then
    return jsonb_build_object('status', 'ok');
  end if;

  if not coalesce(p_allow, false) then
    select count(*) into v_left
      from public.marque_points_group_key k
     where k.group_id = v_group and k.admits;
    if v_left <= 1 then
      return jsonb_build_object('status', 'last');
    end if;
  end if;

  update public.marque_points_group_key
     set admits = coalesce(p_allow, false)
   where id = p_id and group_id = v_group;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Couper un appareil, depuis l'app. La dernière clé qui admet ne se coupe pas :
-- le groupe n'aurait plus de portier, et plus personne n'y entrerait jamais.
create or replace function public.marque_points_cut_key(p_key text, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_admits boolean;
  v_left integer;
begin
  select k.group_id into v_group
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and k.admits;
  if v_group is null then
    raise exception 'cette cle ne fait pas entrer';
  end if;

  select k.admits into v_admits
    from public.marque_points_group_key k
   where k.id = coalesce(p_id, '') and k.group_id = v_group;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;

  if v_admits then
    select count(*) into v_left
      from public.marque_points_group_key k
     where k.group_id = v_group and k.admits;
    if v_left <= 1 then
      return jsonb_build_object('status', 'last');
    end if;
  end if;

  delete from public.marque_points_group_key where id = p_id and group_id = v_group;
  -- La demande acceptée de cet appareil n'a plus de raison d'être. Un refus, en
  -- revanche, reste : l'effacer ferait dire à l'appareil refusé « votre demande
  -- a expiré » au lieu de « elle a été refusée ».
  delete from public.marque_points_request
   where group_id = v_group and state = 'ok'
     and not exists (select 1 from public.marque_points_group_key k
                      where k.group_id = v_group
                        and k.key_hash = public.marque_points_request.ticket_hash);
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Les comptes, facultatifs : une connexion par e-mail (Supabase → Authentication).
-- Un compte retient de quels groupes il est — par les clés de ses appareils,
-- marquées à son nom, jamais une clé en clair — et les secrets d'organisateur
-- de ses sondages. Sur un nouvel appareil, il reçoit une clé neuve par groupe,
-- comme par un lien de retour. Couper toutes ses clés d'un groupe l'en sort.

create table if not exists public.marque_points_account (
  user_id uuid primary key,
  name text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.marque_points_account enable row level security;

create table if not exists public.marque_points_account_owner (
  user_id uuid not null,
  doc_id text not null,
  secret text not null,
  primary key (user_id, doc_id)
);
alter table public.marque_points_account_owner enable row level security;

-- Une clé d'un compte coupée — un téléphone perdu, quelqu'un qu'on sort — sort
-- ce compte du groupe : il ne s'y redonne plus de clé en se connectant, même
-- depuis le téléphone coupé. Seul un appareil admis de nouveau l'y ramène.
create table if not exists public.marque_points_account_cut (
  user_id uuid not null,
  group_id text not null,
  cut_at timestamptz not null default now(),
  primary key (user_id, group_id)
);
alter table public.marque_points_account_cut enable row level security;

create or replace function public.marque_points_account_cut_mark()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_id is not null then
    insert into public.marque_points_account_cut (user_id, group_id)
    values (old.user_id, old.group_id)
    on conflict (user_id, group_id) do update set cut_at = now();
  end if;
  return old;
end;
$$;

drop trigger if exists marque_points_account_cut_mark on public.marque_points_group_key;
create trigger marque_points_account_cut_mark
  after delete on public.marque_points_group_key
  for each row execute function public.marque_points_account_cut_mark();

-- Marquer la clé de cet appareil au nom du compte connecté (et retenir son prénom).
create or replace function public.marque_points_account_link(p_key text, p_name text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group text;
  v_since timestamptz;
begin
  if v_user is null then
    raise exception 'connexion requise';
  end if;
  update public.marque_points_group_key k
     set user_id = v_user
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
  returning k.group_id, k.created_at into v_group, v_since;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  -- Une clé admise après la coupure ramène le compte ; une clé d'avant, non.
  delete from public.marque_points_account_cut
   where user_id = v_user and group_id = v_group and cut_at < v_since;
  if btrim(coalesce(p_name, '')) <> '' then
    insert into public.marque_points_account (user_id, name)
    values (v_user, left(btrim(p_name), 40))
    on conflict (user_id) do update set name = excluded.name, updated_at = now();
  end if;
  return jsonb_build_object('status', 'ok', 'id', v_group);
end;
$$;

-- Exiger un compte dans un groupe, ou ne plus l'exiger : une clé qui fait
-- entrer. Pour l'exiger, il faut être soi-même connecté, avec cette clé à son
-- compte — sinon on s'enfermerait dehors.
create or replace function public.marque_points_set_accounts(p_key text, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
  v_user uuid;
begin
  select k.group_id, k.user_id into v_group, v_user
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
     and k.admits;
  if not found then
    raise exception 'cette cle ne fait pas entrer';
  end if;
  if coalesce(p_on, false) and (auth.uid() is null or v_user is distinct from auth.uid()) then
    return jsonb_build_object('status', 'account');
  end if;
  update public.marque_points_group set accounts_required = coalesce(p_on, false) where id = v_group;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Garder le secret d'organisateur d'un sondage, s'il est bien le sien.
create or replace function public.marque_points_account_owner_put(p_id text, p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'connexion requise';
  end if;
  if not exists (select 1 from public.marque_points_games
                  where id = p_id and owner_hash = md5(coalesce(p_secret, '') || p_id)) then
    return jsonb_build_object('status', 'unknown');
  end if;
  insert into public.marque_points_account_owner (user_id, doc_id, secret)
  values (v_user, p_id, p_secret)
  on conflict (user_id, doc_id) do update set secret = excluded.secret;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Un appareil qui se connecte : une clé neuve pour chaque groupe du compte
-- qu'il n'a pas encore (p_have), et les secrets d'organisateur du compte.
create or replace function public.marque_points_account_restore(p_have jsonb default '[]'::jsonb, p_label text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_groups jsonb := '[]'::jsonb;
  v_row record;
  v_key text;
  v_salt text;
begin
  if v_user is null then
    raise exception 'connexion requise';
  end if;
  select name into v_name from public.marque_points_account where user_id = v_user;
  for v_row in
    select k.group_id, g.name as group_name, bool_or(k.admits) as admits, max(k.person_id) as person_id
      from public.marque_points_group_key k
      join public.marque_points_group g on g.id = k.group_id
     where k.user_id = v_user
       and not (to_jsonb(k.group_id) <@ coalesce(p_have, '[]'::jsonb))
       and not exists (select 1 from public.marque_points_account_cut c
                        where c.user_id = v_user and c.group_id = k.group_id)
     group by k.group_id, g.name
  loop
    v_key := replace(gen_random_uuid()::text, '-', '');
    v_salt := md5(gen_random_uuid()::text);
    insert into public.marque_points_group_key (id, group_id, label, key_hash, key_salt, admits, person_id, user_id)
    values (replace(gen_random_uuid()::text, '-', ''), v_row.group_id,
            left(btrim(coalesce(v_name, '') || ' · ' || coalesce(btrim(p_label), '')), 80),
            md5(v_key || v_salt), v_salt, v_row.admits, v_row.person_id, v_user);
    v_groups := v_groups || jsonb_build_object('id', v_row.group_id, 'name', v_row.group_name,
                                               'key', v_key, 'admits', v_row.admits);
  end loop;
  return jsonb_build_object(
    'status', 'ok',
    'name', coalesce(v_name, ''),
    'groups', v_groups,
    'owners', coalesce((select jsonb_object_agg(o.doc_id, o.secret)
                          from public.marque_points_account_owner o
                          join public.marque_points_games d on d.id = o.doc_id
                         where o.user_id = v_user), '{}'::jsonb));
end;
$$;

-- Quitter un groupe, connecté : le compte n'en est plus, sur aucun appareil.
create or replace function public.marque_points_account_leave(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group text;
begin
  if v_user is null then
    raise exception 'connexion requise';
  end if;
  select k.group_id into v_group from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt);
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  update public.marque_points_group_key set user_id = null
   where group_id = v_group and user_id = v_user;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Supprimer son compte : l'adresse e-mail, le prénom, les secrets gardés, et
-- la marque sur les clés. Les appareils gardent leurs clés : ils restent dans
-- leurs groupes, sans compte. C'est le droit à l'effacement.
create or replace function public.marque_points_account_delete()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'connexion requise';
  end if;
  update public.marque_points_group_key set user_id = null where user_id = v_user;
  delete from public.marque_points_account_owner where user_id = v_user;
  delete from public.marque_points_account_cut where user_id = v_user;
  delete from public.marque_points_account where user_id = v_user;
  -- L'adresse elle-même vit chez Supabase Auth. Si la base refusait d'y
  -- toucher, le reste est effacé quand même, et l'app le dit.
  begin
    delete from auth.users where id = v_user;
  exception when insufficient_privilege then
    return jsonb_build_object('status', 'partial');
  end;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Les changements annoncés aussitôt : à chaque écriture, la base dit « ça a
-- changé » sur Supabase Realtime, sur le canal du document et sur celui de son
-- groupe. L'annonce ne porte rien, ni identifiant ni contenu : l'app qui
-- l'entend redemande comme d'habitude, avec sa clé. Le canal d'un groupe a un
-- nom tiré au hasard (colonne channel, plus haut), donné seulement à qui a une
-- clé. Sans Realtime, rien n'est annoncé, rien n'échoue, et l'app redemande
-- toutes les quelques secondes, comme avant.
create or replace function public.marque_points_announce(p_topic text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regprocedure('realtime.send(jsonb, text, text, boolean)') is null then
    return;
  end if;
  execute 'select realtime.send($1, $2, $3, false)' using '{}'::jsonb, 'changed', p_topic;
exception when others then
  null;
end;
$$;

create or replace function public.marque_points_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel text;
  v_fresh boolean := false;
begin
  if tg_table_name = 'marque_points_request' then
    select channel into v_channel from public.marque_points_group where id = new.group_id;
    if found then
      perform public.marque_points_announce('group-' || v_channel);
    end if;
    return null;
  end if;
  if tg_op <> 'INSERT' then
    perform public.marque_points_announce('doc-' || old.id);
    if old.group_id is not null and old.listed and old.code_hash is null then
      select channel into v_channel from public.marque_points_group where id = old.group_id;
      if found then
        perform public.marque_points_announce('group-' || v_channel);
      end if;
    end if;
  end if;
  if tg_op = 'INSERT' then
    perform public.marque_points_announce('doc-' || new.id);
    v_fresh := true;
  elsif tg_op = 'UPDATE' then
    v_fresh := new.group_id is distinct from old.group_id or not old.listed or old.code_hash is not null;
  end if;
  if v_fresh and new.group_id is not null and new.listed and new.code_hash is null then
    select channel into v_channel from public.marque_points_group where id = new.group_id;
    if found then
      perform public.marque_points_announce('group-' || v_channel);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists marque_points_live on public.marque_points_games;
create trigger marque_points_live
  after insert or update or delete on public.marque_points_games
  for each row execute function public.marque_points_live();

drop trigger if exists marque_points_live on public.marque_points_request;
create trigger marque_points_live
  after insert on public.marque_points_request
  for each row execute function public.marque_points_live();

-- Les notifications. Un appareil qui les active donne l'adresse où son
-- navigateur les reçoit, une fois par groupe, avec sa clé : couper la clé
-- l'efface. Seules les adresses des services d'envoi des navigateurs (Google,
-- Mozilla, Apple, Microsoft) sont gardées, cinq au plus par clé : la fonction
-- n'écrit jamais ailleurs. La fonction « notifier » (étape 10) les envoie ; elle seule lit ces
-- tables, avec la clé de service, jamais la page.
create table if not exists public.marque_points_push (
  endpoint text not null,
  key_id text not null references public.marque_points_group_key(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  lang text not null default 'fr',
  app text not null default '',
  tz text not null default 'Europe/Paris',
  created_at timestamptz not null default now(),
  primary key (endpoint, key_id)
);
alter table public.marque_points_push enable row level security;
create index if not exists marque_points_push_key on public.marque_points_push (key_id);
-- Le fuseau de l'appareil, pour lui rappeler la veille à son heure. Les
-- abonnements d'avant n'en disaient rien : l'heure de Paris, jusqu'à ce que
-- l'appareil le redise en s'ouvrant.
alter table public.marque_points_push
  add column if not exists tz text not null default 'Europe/Paris';

-- Ce qui a déjà été annoncé : une nouveauté ne sonne qu'une fois.
create table if not exists public.marque_points_push_sent (
  doc_id text not null,
  event text not null,
  sent_at timestamptz not null default now(),
  primary key (doc_id, event)
);
alter table public.marque_points_push_sent enable row level security;

-- La paire de clés qui signe les envois, faite une fois par la fonction.
create table if not exists public.marque_points_push_vapid (
  id integer primary key default 1 check (id = 1),
  public_key text not null,
  private_jwk jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.marque_points_push_vapid enable row level security;

-- La version sans fuseau, remplacée ci-dessous : deux fonctions du même nom,
-- et la base ne saurait plus laquelle appeler.
drop function if exists public.marque_points_push_subscribe(text, text, text, text, text, text);

create or replace function public.marque_points_push_subscribe(
  p_key text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_lang text default 'fr',
  p_app text default '',
  p_tz text default 'Europe/Paris'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.marque_points_group_key;
  v_required boolean;
begin
  select k.* into v_key
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
   limit 1;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  select g.accounts_required into v_required from public.marque_points_group g where g.id = v_key.group_id;
  if v_required and v_key.user_id is null then
    return jsonb_build_object('status', 'account');
  end if;
  if coalesce(p_endpoint, '') !~ ('^https://(fcm\.googleapis\.com|android\.googleapis\.com'
                                   '|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com'
                                   '|([a-z0-9-]+\.)*notify\.windows\.com)/\S+$')
     or length(p_endpoint) > 1000
     or coalesce(p_p256dh, '') !~ '^[A-Za-z0-9_-]{80,100}$'
     or coalesce(p_auth, '') !~ '^[A-Za-z0-9_-]{16,32}$' then
    raise exception 'abonnement invalide';
  end if;
  insert into public.marque_points_push (endpoint, key_id, p256dh, auth, lang, app, tz, created_at)
  values (p_endpoint, v_key.id, p_p256dh, p_auth,
          case when p_lang = 'en' then 'en' else 'fr' end,
          case when coalesce(p_app, '') ~ '^https?://\S+$' and length(p_app) <= 300 then p_app else '' end,
          -- Un fuseau que la base connaît, et rien d'autre : elle en calcule
          -- l'heure à chaque rappel, et un nom inconnu les arrêterait tous.
          case when length(coalesce(p_tz, '')) <= 64
                    and exists (select 1 from pg_timezone_names z where z.name = p_tz)
               then p_tz else 'Europe/Paris' end,
          clock_timestamp())
  on conflict (endpoint, key_id) do update
     set p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang, app = excluded.app,
         tz = excluded.tz, created_at = excluded.created_at;
  delete from public.marque_points_push p
   where p.key_id = v_key.id
     and p.endpoint not in (select q.endpoint from public.marque_points_push q
                             where q.key_id = v_key.id order by q.created_at desc limit 5);
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.marque_points_push_unsubscribe(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.marque_points_push where endpoint = p_endpoint;
$$;

-- Pour la fonction seule : la paire de clés, faite à son premier appel. Deux
-- appels en même temps ne font qu'une paire : la première gardée l'emporte.
create or replace function public.marque_points_push_vapid(p_public text default null, p_private jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.marque_points_push_vapid;
begin
  if p_public is not null and p_private is not null then
    insert into public.marque_points_push_vapid (id, public_key, private_jwk)
    values (1, p_public, p_private)
    on conflict (id) do nothing;
  end if;
  select * into v_row from public.marque_points_push_vapid where id = 1;
  if not found then
    return null;
  end if;
  return jsonb_build_object('public', v_row.public_key, 'private', v_row.private_jwk);
end;
$$;

-- Pour la fonction seule : ce qu'un document a de nouveau, et à qui le dire.
-- Nouveau : créé il y a moins de deux jours, jamais annoncé. Une date : jamais
-- annoncée pour ce document, et pas encore passée. Un document plus ancien,
-- vu pour la première fois, est noté sans rien annoncer. Jamais à l'appareil
-- qui l'a écrit, ni, dans un groupe qui exige un compte, à un appareil sans
-- compte : il n'y voit rien de ce qui est partagé.
create or replace function public.marque_points_push_event(p_key text, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.marque_points_group_key;
  v_group public.marque_points_group;
  v_doc public.marque_points_games;
  v_kind text;
  v_date text;
  v_event text;
  v_created double precision;
begin
  select k.* into v_key
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
   limit 1;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  select g.* into v_group from public.marque_points_group g where g.id = v_key.group_id;
  if v_group.accounts_required and v_key.user_id is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  select d.* into v_doc
    from public.marque_points_games d
   where d.id = p_id and d.group_id = v_key.group_id and d.listed and d.code_hash is null;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  v_kind := v_doc.data->>'kind';
  if v_kind is null or v_kind not in ('poll', 'list', 'spend', 'board') then
    return jsonb_build_object('status', 'quiet');
  end if;
  if v_kind = 'poll' and coalesce(v_doc.data->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' then
    v_date := v_doc.data->>'date';
  end if;

  insert into public.marque_points_push_sent (doc_id, event) values (p_id, 'new')
  on conflict do nothing;
  if found then
    if v_date is not null then
      insert into public.marque_points_push_sent (doc_id, event) values (p_id, 'date:' || v_date)
      on conflict do nothing;
    end if;
    if jsonb_typeof(v_doc.data->'createdAt') = 'number' then
      v_created := (v_doc.data->>'createdAt')::double precision;
    end if;
    if v_created is null or v_created < extract(epoch from now()) * 1000 - 2 * 86400000 then
      return jsonb_build_object('status', 'quiet');
    end if;
    v_event := 'new';
  elsif v_date is not null then
    insert into public.marque_points_push_sent (doc_id, event) values (p_id, 'date:' || v_date)
    on conflict do nothing;
    if not found or v_date < to_char(now() - interval '1 day', 'YYYY-MM-DD') then
      return jsonb_build_object('status', 'quiet');
    end if;
    v_event := 'date';
  else
    return jsonb_build_object('status', 'quiet');
  end if;

  return jsonb_build_object(
    'status', 'ok', 'event', v_event, 'id', p_id, 'group', v_group.name,
    'doc', jsonb_build_object(
      'kind', v_kind, 'question', v_doc.data->'question', 'title', v_doc.data->'title',
      'name', v_doc.data->'name', 'fixed', v_doc.data->'fixed', 'date', v_date, 'at', v_doc.data->'at'),
    'targets', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', t.endpoint, 'p256dh', t.p256dh, 'auth', t.auth,
                                          'lang', t.lang, 'app', t.app))
        from (select distinct on (p.endpoint) p.*
                from public.marque_points_push p
                join public.marque_points_group_key k on k.id = p.key_id
               where k.group_id = v_group.id
                 and (not v_group.accounts_required or k.user_id is not null)
                 and p.endpoint not in (select mine.endpoint from public.marque_points_push mine
                                         where mine.key_id = v_key.id)) t), '[]'::jsonb));
end;
$$;

-- Pour la fonction seule : quelqu'un frappe, à dire à qui fait entrer. Une fois.
create or replace function public.marque_points_push_knock(p_ticket text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.marque_points_request;
  v_name text;
begin
  select r.* into v_request
    from public.marque_points_request r
   where r.state = 'waiting' and r.ticket_hash = md5(coalesce(p_ticket, '') || r.ticket_salt)
   limit 1;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  insert into public.marque_points_push_sent (doc_id, event) values (v_request.id, 'knock')
  on conflict do nothing;
  if not found then
    return jsonb_build_object('status', 'quiet');
  end if;
  select g.name into v_name from public.marque_points_group g where g.id = v_request.group_id;
  return jsonb_build_object(
    'status', 'ok', 'event', 'knock', 'group', v_name, 'who', v_request.name,
    'targets', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', t.endpoint, 'p256dh', t.p256dh, 'auth', t.auth,
                                          'lang', t.lang, 'app', t.app))
        from (select distinct on (p.endpoint) p.*
                from public.marque_points_push p
                join public.marque_points_group_key k on k.id = p.key_id
               where k.group_id = v_request.group_id and k.admits) t), '[]'::jsonb));
end;
$$;

-- Pour la fonction seule, une fois l'heure : les rappels de la veille. Un
-- événement qui commence demain, ou qui a demain des activités, se rappelle
-- une fois dans chaque fuseau de ses appareils, entre 18 h et 23 h à leur
-- heure ; avec, s'il commence, ce qui reste à faire dans sa chaîne : les
-- lignes pas cochées, les sondages encore ouverts. Pas quand sa date a été
-- annoncée il y a moins de douze heures : on vient de l'apprendre.
create or replace function public.marque_points_push_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb := '[]'::jsonb;
  v_zone record;
  v_event record;
  v_day text;
  v_starts boolean;
  v_chain text[];
  v_lines integer;
  v_polls integer;
  v_targets jsonb;
begin
  for v_zone in
    select distinct k.group_id, p.tz
      from public.marque_points_push p
      join public.marque_points_group_key k on k.id = p.key_id
  loop
    continue when extract(hour from now() at time zone v_zone.tz) not between 18 and 22;
    v_day := to_char((now() at time zone v_zone.tz)::date + 1, 'YYYY-MM-DD');
    for v_event in
      select d.id, d.data, grp.name as group_name, grp.accounts_required,
             coalesce((
               select jsonb_agg(jsonb_build_object('question', a.data->'question', 'title', a.data->'title',
                                                   'at', a.data->'at')
                                order by a.data->>'at' nulls first, a.id)
                 from public.marque_points_games a
                where a.group_id = d.group_id and a.listed and a.code_hash is null
                  and a.data->>'kind' = 'poll' and a.data->>'date' = v_day
                  and jsonb_typeof(a.data->'archivedAt') is distinct from 'number'
                  and (case when a.data ? 'parent' then a.data->>'parent' else a.data->>'event' end) = d.id
             ), '[]'::jsonb) as activities
        from public.marque_points_games d
        join public.marque_points_group grp on grp.id = d.group_id
       where d.group_id = v_zone.group_id and d.listed and d.code_hash is null
         and d.data->>'kind' = 'poll'
         and coalesce(d.data->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
         and d.data->>'date' <= v_day
         and coalesce(d.data->>'until', d.data->>'date') >= v_day
         and jsonb_typeof(d.data->'archivedAt') is distinct from 'number'
         -- Une activité se rappelle avec son événement, pas toute seule.
         and not exists (
           select 1 from public.marque_points_games up
            where up.group_id = d.group_id and up.data->>'kind' = 'poll'
              and up.id = (case when d.data ? 'parent' then d.data->>'parent' else d.data->>'event' end)
              and (coalesce(up.data->>'date', '') <> '' or up.data->'fixed' = 'true'::jsonb))
    loop
      v_starts := v_event.data->>'date' = v_day;
      continue when not v_starts and jsonb_array_length(v_event.activities) = 0;
      continue when v_starts and exists (
        select 1 from public.marque_points_push_sent s
         where s.doc_id = v_event.id and s.event = 'date:' || v_day and s.sent_at > now() - interval '12 hours');
      insert into public.marque_points_push_sent (doc_id, event)
      values (v_event.id, 'eve:' || v_day || '@' || v_zone.tz)
      on conflict do nothing;
      continue when not found;

      v_lines := 0;
      v_polls := 0;
      if v_starts then
        with recursive chain(id) as (
          select v_event.id
          union
          select g.id
            from public.marque_points_games g
            join chain c on c.id = (case when g.data ? 'parent' then g.data->>'parent' else g.data->>'event' end)
           where g.group_id = v_zone.group_id and g.code_hash is null
        )
        select array_agg(id) into v_chain from chain;
        select count(*) into v_lines
          from public.marque_points_games g,
               jsonb_array_elements(case when jsonb_typeof(g.data->'items') = 'array'
                                         then g.data->'items' else '[]'::jsonb end) i
         where g.id = any(v_chain) and g.listed and g.data->>'kind' = 'list'
           and jsonb_typeof(g.data->'archivedAt') is distinct from 'number'
           and g.data->'template' is distinct from 'true'::jsonb
           and i.value->'done' is distinct from 'true'::jsonb;
        select count(*) into v_polls
          from public.marque_points_games g
         where g.id = any(v_chain) and g.id <> v_event.id and g.listed and g.data->>'kind' = 'poll'
           and jsonb_typeof(g.data->'archivedAt') is distinct from 'number'
           and jsonb_typeof(g.data->'closedAt') is distinct from 'number'
           and coalesce(g.data->>'date', '') = ''
           and g.data->'fixed' is distinct from 'true'::jsonb;
      end if;

      select coalesce(jsonb_agg(jsonb_build_object('endpoint', t.endpoint, 'p256dh', t.p256dh, 'auth', t.auth,
                                                   'lang', t.lang, 'app', t.app)), '[]'::jsonb)
        into v_targets
        from (select distinct on (p.endpoint) p.*
                from public.marque_points_push p
                join public.marque_points_group_key k on k.id = p.key_id
               where k.group_id = v_zone.group_id and p.tz = v_zone.tz
                 and (not v_event.accounts_required or k.user_id is not null)) t;

      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'event', 'eve', 'id', v_event.id, 'group', v_event.group_name, 'day', v_day, 'starts', v_starts,
        'doc', jsonb_build_object('kind', 'poll', 'question', v_event.data->'question',
                                  'title', v_event.data->'title', 'date', v_event.data->'date',
                                  'at', v_event.data->'at'),
        'activities', v_event.activities,
        'left', jsonb_build_object('lines', v_lines, 'polls', v_polls),
        'targets', v_targets));
    end loop;
  end loop;
  return v_out;
end;
$$;

-- Pour la fonction seule : les mots laissés sur un sondage, un événement ou un
-- tableau d'idées, à dire au groupe. Ceux des deux derniers jours, chacun une
-- fois ; jamais à l'appareil qui les a écrits, ni, dans un groupe qui exige un
-- compte, à un appareil sans compte.
create or replace function public.marque_points_push_words(p_key text, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.marque_points_group_key;
  v_group public.marque_points_group;
  v_doc public.marque_points_games;
  v_cell record;
  v_new jsonb := '[]'::jsonb;
begin
  select k.* into v_key
    from public.marque_points_group_key k
   where k.key_hash = md5(coalesce(p_key, '') || k.key_salt)
   limit 1;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  select g.* into v_group from public.marque_points_group g where g.id = v_key.group_id;
  if v_group.accounts_required and v_key.user_id is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  select d.* into v_doc
    from public.marque_points_games d
   where d.id = p_id and d.group_id = v_key.group_id and d.listed and d.code_hash is null;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;
  if coalesce(v_doc.data->>'kind', '') not in ('poll', 'board')
     or jsonb_typeof(v_doc.data->'comments') is distinct from 'object' then
    return jsonb_build_object('status', 'quiet');
  end if;

  for v_cell in
    select c.key, c.value
      from jsonb_each(v_doc.data->'comments') c
     where jsonb_typeof(c.value->'t') = 'string' and btrim(c.value->>'t') <> ''
       and jsonb_typeof(c.value->'made') = 'number'
       and (c.value->>'made')::numeric > extract(epoch from now()) * 1000 - 2 * 86400000
     order by (c.value->>'made')::numeric
  loop
    insert into public.marque_points_push_sent (doc_id, event) values (p_id, 'words:' || left(v_cell.key, 100))
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'n', left(coalesce(v_cell.value->>'n', ''), 40), 't', left(v_cell.value->>'t', 140)));
    end if;
  end loop;
  if jsonb_array_length(v_new) = 0 then
    return jsonb_build_object('status', 'quiet');
  end if;

  return jsonb_build_object(
    'status', 'ok', 'event', 'words', 'id', p_id, 'group', v_group.name,
    'doc', jsonb_build_object(
      'kind', v_doc.data->>'kind', 'question', v_doc.data->'question', 'title', v_doc.data->'title',
      'name', v_doc.data->'name', 'fixed', v_doc.data->'fixed', 'date', v_doc.data->'date'),
    'words', v_new,
    'targets', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', t.endpoint, 'p256dh', t.p256dh, 'auth', t.auth,
                                          'lang', t.lang, 'app', t.app))
        from (select distinct on (p.endpoint) p.*
                from public.marque_points_push p
                join public.marque_points_group_key k on k.id = p.key_id
               where k.group_id = v_group.id
                 and (not v_group.accounts_required or k.user_id is not null)
                 and p.endpoint not in (select mine.endpoint from public.marque_points_push mine
                                         where mine.key_id = v_key.id)) t), '[]'::jsonb));
end;
$$;

-- Pour la fonction seule : une adresse que le service d'envoi dit disparue.
create or replace function public.marque_points_push_gone(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.marque_points_push where endpoint = p_endpoint;
$$;

-- PostgreSQL accorde l'exécution à tout le monde par défaut : ce qui ne doit
-- s'exécuter que d'ici, depuis l'éditeur SQL, doit être retiré explicitement.
-- Sans cette ligne, quiconque a la clé publique de la page — elle est dans le
-- code, c'est son rôle — pourrait refaire la clé d'un groupe dont il connaît le
-- nom : tous les appareils dehors, et le groupe à lui.
revoke all on function public.marque_points_fresh_code() from public, anon, authenticated;
revoke all on function public.marque_points_merge_votes(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.marque_points_add_options(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.marque_points_new_group(text) from public, anon, authenticated;
revoke all on function public.marque_points_new_group_key(text) from public, anon, authenticated;
revoke all on function public.marque_points_person_out() from public, anon, authenticated;

grant execute on function public.marque_points_invite(text, integer, integer) to anon, authenticated;
grant execute on function public.marque_points_ask(text, text, text, text) to anon, authenticated;
grant execute on function public.marque_points_claim(text) to anon, authenticated;
grant execute on function public.marque_points_requests(text) to anon, authenticated;
grant execute on function public.marque_points_answer(text, text, boolean) to anon, authenticated;
grant execute on function public.marque_points_group_keys(text) to anon, authenticated;
grant execute on function public.marque_points_cut_key(text, text) to anon, authenticated;
grant execute on function public.marque_points_set_admits(text, text, boolean) to anon, authenticated;
grant execute on function public.marque_points_my_link(text) to anon, authenticated;
grant execute on function public.marque_points_return(text, text) to anon, authenticated;
grant execute on function public.marque_points_forget_link(text, text) to anon, authenticated;
grant execute on function public.marque_points_group_of(text) to anon, authenticated;
grant execute on function public.marque_points_group_docs(text) to anon, authenticated;
grant execute on function public.marque_points_put(text, jsonb, text, text) to anon, authenticated;
grant execute on function public.marque_points_delete(text, text, text) to anon, authenticated;
grant execute on function public.marque_points_put_set(text, jsonb, text, text) to anon, authenticated;
grant execute on function public.marque_points_forget_set(text, text) to anon, authenticated;
grant execute on function public.marque_points_open_set(text, text) to anon, authenticated;
revoke all on function public.marque_points_account_link(text, text) from public, anon;
revoke all on function public.marque_points_account_owner_put(text, text) from public, anon;
revoke all on function public.marque_points_account_restore(jsonb, text) from public, anon;
revoke all on function public.marque_points_account_leave(text) from public, anon;
grant execute on function public.marque_points_account_link(text, text) to authenticated;
grant execute on function public.marque_points_account_owner_put(text, text) to authenticated;
grant execute on function public.marque_points_account_restore(jsonb, text) to authenticated;
grant execute on function public.marque_points_account_leave(text) to authenticated;
revoke all on function public.marque_points_account_delete() from public, anon;
grant execute on function public.marque_points_set_accounts(text, boolean) to anon, authenticated;
revoke all on function public.marque_points_account_cut_mark() from public, anon, authenticated;
revoke all on function public.marque_points_announce(text) from public, anon, authenticated;
revoke all on function public.marque_points_live() from public, anon, authenticated;
grant execute on function public.marque_points_push_subscribe(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.marque_points_push_unsubscribe(text) to anon, authenticated;
revoke all on function public.marque_points_push_vapid(text, jsonb) from public, anon, authenticated;
revoke all on function public.marque_points_push_event(text, text) from public, anon, authenticated;
revoke all on function public.marque_points_push_knock(text) from public, anon, authenticated;
revoke all on function public.marque_points_push_reminders() from public, anon, authenticated;
revoke all on function public.marque_points_push_words(text, text) from public, anon, authenticated;
revoke all on function public.marque_points_push_gone(text) from public, anon, authenticated;
grant execute on function public.marque_points_push_vapid(text, jsonb) to service_role;
grant execute on function public.marque_points_push_event(text, text) to service_role;
grant execute on function public.marque_points_push_knock(text) to service_role;
grant execute on function public.marque_points_push_reminders() to service_role;
grant execute on function public.marque_points_push_words(text, text) to service_role;
grant execute on function public.marque_points_push_gone(text) to service_role;
grant execute on function public.marque_points_account_delete() to authenticated;
```

Attendu : **Success. No rows returned.**

> Si vous aviez passé la version précédente de cette étape — celle avec une clé
> unique, sans groupe —, ce bloc l'efface proprement : la clé d'avant ne servira
> plus, et les appareils devront recevoir une clé de groupe. Ce qui était déjà
> partagé reste.

#### Et les groupes qui existent déjà ?

Ils restent, et personne n'a rien à refaire. Éprouvé en montant une base avec la
version précédente de cette étape — un groupe, trois appareils entrés par
l'ancien chemin, trois documents partagés, une invitation en cours — puis en
appliquant ce bloc par-dessus :

| | après le bloc |
| --- | --- |
| Le groupe et son nom | inchangés |
| Les clés des appareils | **toutes valables**, rien à recoller |
| Ce qui était partagé | toujours là, et toujours dans son groupe |
| Partager, contribuer, supprimer | comme avant, sans rien retoucher |
| Une invitation déjà envoyée | sert encore — elle fait désormais **frapper** |
| Qui fait entrer | **la clé affichée à la création du groupe** ; les appareils entrés avant ne font entrer personne |

Deux conséquences à connaître :

- **Une copie de l'app ouverte depuis longtemps** appelle encore l'ancienne
  entrée directe, qui n'existe plus : elle dira que la base n'a pas répondu.
  Rechargez la page — l'app se sert d'abord du réseau, la nouvelle version
  arrive d'elle-même.
- **Si la clé qui fait entrer n'est pas celle que vous voulez** — une base montée
  à la main, par exemple —, désignez-en une autre avec l'`update` de l'étape 4.

### 1 bis. Tout remettre à zéro

**À ne faire que si vous voulez repartir de rien** — un groupe créé pour essayer,
des partages de test, une clé qui traîne. Effacez la zone de texte et lancez :

```sql
-- Repartir de zéro : plus aucun groupe, aucune clé, aucune demande, aucune
-- invitation, et plus rien de partagé dans la base.
delete from public.marque_points_request;
delete from public.marque_points_invite;
delete from public.marque_points_join_miss;
delete from public.marque_points_group_key;
delete from public.marque_points_group;
delete from public.marque_points_games;
```

Attendu : six lignes `DELETE n`. Ce que cela efface, dit franchement :

- **tous les groupes et toutes les clés** : aucun appareil n'appartient plus à
  rien, et les clés copiées jusqu'ici ne servent plus à rien ;
- **tout ce qui était partagé** — parties, listes, sondages — *dans la base* ;
- **tous les liens déjà envoyés**, y compris les lots à six chiffres : ils ne
  s'ouvriront plus ;
- **les personnes du groupe et leurs liens de retour** : la table des personnes
  suit celle des groupes (`on delete cascade`), donc un lien de retour envoyé
  autrefois ne ramène plus personne ;
- **l'adresse d'abonnement de l'agenda**, s'il y en avait une : elle vivait sur
  le groupe, elle part avec lui. Les agendas abonnés cessent de recevoir quoi
  que ce soit.

Ce que cela n'efface pas : **ce qui est sur les appareils**. Chaque app garde sa
propre copie de ses parties, listes et sondages ; elle continue de les afficher,
simplement plus rien n'est partagé. À la prochaine ouverture, chaque appareil
constate que sa clé n'ouvre plus rien, retire le groupe de sa liste et le dit —
vous n'avez rien à faire sur les téléphones.

> Le **dernier** `delete` de la liste — celui sur `marque_points_games` — vide la
> table qui porte les documents partagés. Si vous voulez garder ce qui est partagé et ne refaire que les
> groupes, retirez la ligne `delete from public.marque_points_games;` — mais
> lancez alors la requête de rattachement (**2 bis** ci-dessous) après avoir créé
> le nouveau groupe, sinon ces documents n'appartiendront à personne.

### 2. Créer votre premier groupe

Effacez la zone de texte et lancez :

```sql
select * from public.marque_points_new_group('Mifa');
```

Elle affiche deux colonnes : le **nom** et la **clé**, une suite de 32
caractères. **Copiez la clé maintenant** : elle ne sera plus jamais affichée. La
base n'en garde qu'une empreinte.

Recommencez avec un autre nom pour un autre cercle — `'Copains du mardi'`, par
exemple. Un appareil peut appartenir à plusieurs groupes ; l'app demande alors
dans lequel partager.

### 2 bis. Rattacher ce qui était déjà partagé

**À ne faire que si vous aviez déjà partagé des parties** avec la version
précédente. Ce qui l'était n'appartient à aucun groupe : le bouton *Tout
récupérer* l'ignorerait, et l'app ne pourrait plus le supprimer. Cette requête
le range dans le groupe que vous venez de créer :

```sql
update public.marque_points_games
   set group_id = (select id from public.marque_points_group where name = 'Mifa')
 where group_id is null;
```

Attendu : **UPDATE n**, où n est le nombre de choses déjà partagées. Les liens
déjà envoyés continuent de fonctionner, avant comme après.

### 3. Faire entrer les appareils

**Le tout premier appareil** n'a personne pour l'inviter : il part de la clé que
vous venez de copier. Dans l'app, onglet **Groupes** → **Entrer, inviter, gérer** → dépliez
*Je n'ai pas de code, mais une clé* → collez → **Entrer**.

C'est cette clé — et elle seule — qui **fait entrer les autres**. Gardez-la sur
votre appareil : les clés distribuées ensuite voient tout et partagent, mais
n'acceptent personne.

**Tous les autres frappent, et c'est vous qui ouvrez.** Touchez **Inviter** à
côté du nom du groupe, choisissez **plusieurs personnes** (la conversation de
famille) ou **une seule personne** (la première demande consomme le lien, donc
un lien transféré ne sert à personne d'autre), et **envoyez le message tel
quel**. Les deux valent **deux jours**.

Le message porte tout ce que la personne aura à savoir, et rien d'autre :

```
Rejoins Mifa sur Together.

Nom : Mifa
Code : 556237

1. Ouvre le lien : https://votre-compte.github.io/Code/#/join/556237/Mifa
2. Installe l'app : iPhone (Safari) → Partager → « Sur l'écran d'accueil ».
   Android (Chrome) → ⋮ → « Installer l'application ».
3. Dans l'app : Groupes → Entrer dans un groupe → colle le nom et le code.

Valable 2 jours.
```

L'ordre compte, et c'est pour ça qu'il est écrit : **installer d'abord, entrer
ensuite, depuis l'app**. Un lien s'ouvre toujours dans le navigateur, jamais
dans une app posée sur un écran d'accueil — celle-ci a son propre stockage, et
entrer depuis le navigateur la laisserait vide.

**Coller suffit.** La personne colle le message — en entier, sans rien y
sélectionner — dans la case du nom *ou* dans celle du code : l'app y lit le nom
du groupe et les six chiffres, et remplit les deux. Elle ajoute son prénom,
touche **Entrer**, et rien ne s'ouvre : la demande arrive chez vous.

Dans votre onglet **Groupes** (et en tête de l'Accueil, sous *Pour vous*), sous *On frappe*, elle apparaît avec ce prénom :
**Accepter** ou **Refuser**.

Accepté, l'appareil d'en face s'en aperçoit tout seul (sa page regarde, et
l'acceptation est vue de toute façon à la prochaine ouverture de l'app), reçoit
**sa propre clé** et récupère d'un coup ce que le groupe partage. Refusé, il
l'apprend, et n'a jamais rien ouvert.

> **Il n'y a pas de notification.** Vous voyez qu'on a frappé en ouvrant l'app,
> et la personne voit votre réponse en ouvrant la sienne. Dites-vous un mot de
> vive voix, comme pour le code.

Si le lien ne passe pas — un message qui l'abîme, quelqu'un au téléphone —
**dites le nom du groupe et les six chiffres** affichés sous le lien : l'onglet
**Groupes** de l'autre appareil les accepte tels quels, et la page d'entrée aussi,
en dépliant *Nom du groupe et code*. La suite est la même : ça frappe, vous
acceptez.

> C'est ce qui rend le lien tranquille : **une invitation ne donne que le
> droit de frapper**. Transférée, capturée, retrouvée dans un fil de discussion,
> elle ne fait entrer personne sans vous. Une demande de trop se refuse d'une
> touche, et n'a rien vu entre-temps.

> Le code ne fait que six chiffres, mais il ne suffit pas : il faut aussi le nom
> du groupe, et même les deux ne font que frapper — la demande arrive chez vous,
> et se refuse d'une touche. Un vrai code donné avec un autre nom compte comme un
> essai raté : au-delà de vingt en dix minutes sur un même groupe, la base n'y
> ouvre plus du tout pendant un moment — et une demande réussie efface
> l'ardoise. Au-delà de cinquante demandes en attente, elle n'en prend plus :
> personne ne peut vous noyer sous les lignes.

Faites-le sur chaque appareil : le vôtre, celui des personnes du groupe, Safari
et l'app de l'écran d'accueil (qui comptent pour deux — ce sont bien deux
appareils pour la base, chacun avec sa clé).

> **Ce qu'un appareil du groupe va chercher, et quand.** En ouvrant l'app et
> chaque fois qu'on y revient (depuis Safari, depuis une autre app, après un
> écran verrouillé), il rapatrie tout seul ce que le groupe a partagé depuis. Le
> bouton **⟳** de la barre du haut fait la même chose sur commande, depuis
> n'importe quel onglet, et dit combien d'éléments sont arrivés. Une partie, une
> liste ou un sondage **ouvert à l'écran** se met à jour de lui-même toutes les
> cinq secondes, sans rien toucher. Une demande sans réponse
s'effface au bout de **sept jours** ; une réponse non lue, au bout d'un jour —
d'ici là elle attend sagement que l'app soit ouverte.

> ⚠️ Ne mettez **jamais** une clé de groupe dans `src/config.js` ni ailleurs dans
> le dépôt : ce fichier est public, et la clé le deviendrait avec lui.

### 4. Couper un appareil, ou tout le monde

**Depuis l'app, et c'est le cas courant** : Groupes → le groupe → dépliez *Qui est
dans le groupe*. Une ligne par appareil, avec le prénom donné à l'entrée, d'où il
vient et quand il est arrivé. **Couper** le met dehors : il ne verra plus rien de
nouveau, ne pourra plus rien partager, et ce qu'il avait déjà récupéré reste chez
lui — on ne rappelle pas ce qui est déjà lu. À la prochaine ouverture, son app le
lui dit plutôt que de tout refuser sans raison.

Votre propre appareil n'a pas de bouton *Couper*, et la **dernière clé qui fait
entrer** ne se coupe pas : le groupe se retrouverait sans personne pour accepter
qui que ce soit.

**Depuis l'éditeur SQL**, si vous préférez, ou si vous avez perdu l'appareil qui
fait entrer :

```sql
select id, label, admits, created_at from public.marque_points_group_key
 where group_id = (select id from public.marque_points_group where name = 'Mifa');

delete from public.marque_points_group_key where id = 'ID_DE_LA_LIGNE';
```

**Pour désigner qui fait entrer, l'app suffit** : Groupes → le groupe → *Qui est
dans le groupe* → **Peut faire entrer** sur la ligne voulue, et **Ne plus faire
entrer** pour le retirer. Il faut faire entrer soi-même pour l'accorder, et la
dernière clé qui admet ne se retire pas.

Depuis l'éditeur SQL, si vous préférez :

```sql
update public.marque_points_group_key set admits = true where id = 'ID_DE_LA_LIGNE';
```

**Tout le monde dehors, et on repart** — le bouton d'alarme. Toutes les clés du
groupe sont coupées, liens de retour compris, et une seule est refaite, qui fait
entrer ; ce qui est partagé reste :

```sql
select public.marque_points_new_group_key('Mifa');
```

Recollez la clé affichée sur votre appareil (étape 3), puis réinvitez les autres.

### 5. Vérifier

Une requête à la fois, en remplaçant `VOTRE_CLE` par la clé copiée :

```sql
select public.marque_points_group_of('VOTRE_CLE');
```

Attendu : `{"id": "...", "name": "Mifa", "admits": true}` — `admits` étant ce
qui fait de cette clé celle qui accepte les demandes. Avec n'importe quoi d'autre
à la place : une cellule vide.

Pour voir la porte fonctionner sans quitter l'éditeur :

```sql
select public.marque_points_invite('VOTRE_CLE', 1440, 50);
select public.marque_points_ask('Mifa', 'LE_CODE_AFFICHE', 'Test', 'navigateur');
select public.marque_points_requests('VOTRE_CLE');
select public.marque_points_answer('VOTRE_CLE', 'ID_DE_LA_DEMANDE', false);
select jsonb_array_length(public.marque_points_group_keys('VOTRE_CLE'));
```

Attendu, dans l'ordre : un code à six chiffres valable 1440 minutes et 50
demandes ; `{"status": "waiting", "ticket": "...", ...}` — un jeton, pas une clé ;
la demande, avec son prénom ; `{"status": "refused"}` ; et le nombre d'appareils
du groupe, **inchangé** par ce refus.

```sql
select public.marque_points_put('g_de_test_1', '{"id":"g_de_test_1"}'::jsonb);
select public.marque_points_put('g_de_test_1', '{"id":"g_de_test_1"}'::jsonb, 'VOTRE_CLE');
select public.marque_points_put('g_de_test_1', '{"id":"g_de_test_1","ok":true}'::jsonb);
select jsonb_array_length(public.marque_points_group_docs('VOTRE_CLE'));
select public.marque_points_delete('g_de_test_1', 'VOTRE_CLE');
```

Attendu, dans l'ordre : une **erreur rouge** `cle de groupe invalide` — c'est le
but ; une cellule vide ; une cellule vide encore (contribuer ne demande rien) ;
**1** ; et une cellule vide.

> Ce bloc et ces requêtes ont été exécutés tels quels sur un PostgreSQL 16 avec
> les rôles de Supabase, et le bloc a été repassé deux fois de suite pour vérifier
> qu'il se relance sans dommage. Ce qui a été éprouvé : sans clé rien ne se crée ;
> une clé n'ouvre que son groupe ; un groupe ne voit pas les documents du groupe
> d'à côté ; deux groupes ne peuvent pas porter le même nom ; un jeton non accepté
> n'ouvre rien, et un jeton refusé jamais ; le jeton accepté devient la clé de son
> appareil, sans que rien ait circulé en clair ; une clé ordinaire ne lit pas les
> demandes et n'accepte personne ; couper une clé laisse les autres intactes, mais
> la dernière clé qui fait entrer est protégée ; couper le dernier appareil d'une
> personne coupe son lien de retour ; une invitation expirée ne frappe plus ;
> trente codes tirés au hasard ne disent pas lequel existe, et ne bloquent ni le
> vrai code ni les liens de retour ; vingt essais ratés ferment l'entrée du groupe
> pendant dix minutes sans gêner le groupe d'à côté ; cinquante demandes en
> attente et la porte n'en prend plus ; et le rôle public — celui de la clé publique qui est dans la page — ne
> peut ni créer de groupe, ni refaire la clé d'un groupe, ni tirer de code, ni
> lire aucune table.

## Étape 3 — Vérifier, sans quitter la page

Toujours dans **SQL Editor**, effacez ce que vous venez de coller et lancez ces
quatre requêtes **une par une** — l'éditeur n'affiche que le résultat de la
dernière, donc tout coller d'un bloc ne montrerait rien d'utile.

**1. Écrire une partie de test**

```sql
select public.marque_points_put('test_marque_points', '{"id":"test_marque_points","ok":true}'::jsonb);
```

Résultat attendu : **`NULL`, ou une cellule vide** — les deux veulent dire la
même chose. C'est normal : cette fonction ne renvoie rien (`returns void`), et
l'éditeur l'affiche tantôt `NULL`, tantôt comme une case vide, pour dire
« exécutée, rien à signaler ». Une fonction absente donnerait une erreur rouge,
jamais une case vide.

**2. La relire** — la seule requête qui compte vraiment

```sql
select public.marque_points_get('test_marque_points');
```

Résultat attendu :

```
{"id": "test_marque_points", "ok": true}
```

Les espaces après les deux-points sont normaux : Postgres réécrit le JSON à sa
façon. **Si vous voyez ça, votre base est prête.** Si vous voyez `NULL`,
l'écriture n'a pas fonctionné : reprenez l'étape 2.

**3. La supprimer**

```sql
select public.marque_points_delete('test_marque_points');
```

Résultat attendu : **`NULL` ou une cellule vide**, pour la même raison qu'à la
première requête.

**4. Vérifier qu'elle a disparu**

```sql
select public.marque_points_get('test_marque_points');
```

Résultat attendu : **`NULL`** — et cette fois, ce `NULL` est la preuve que la
suppression a fonctionné.

En résumé :

| Requête | Attendu | Ce que ça veut dire |
| --- | --- | --- |
| `put` | `NULL` ou case vide | la fonction ne renvoie rien, c'est normal |
| `get` après écriture | le JSON | **tout fonctionne** |
| `delete` | `NULL` ou case vide | la fonction ne renvoie rien, c'est normal |
| `get` après suppression | `NULL` ou case vide | la partie a bien été effacée |

> Ce bloc SQL et ces requêtes ont été exécutés tels quels sur un PostgreSQL 16,
> avec les mêmes rôles que chez Supabase. La table s'est révélée inaccessible en
> lecture comme en écriture pour le rôle public, les deux garde-fous se sont
> déclenchés, et seules les fonctions ont fonctionné.

## Étape 4 — Copier les deux valeurs

Dans la colonne de gauche, tout en bas : **Project Settings** (roue dentée) →
**API** (ou **API Keys** selon la version).

- **Project URL** — ressemble à `https://abcdefgh.supabase.co`
- **anon public** — une très longue chaîne commençant par `eyJ`

Si la page vous montre plutôt l'adresse du point d'entrée REST,
`https://abcdefgh.supabase.co/rest/v1`, ce n'est pas grave : l'app accepte les
deux formes, avec ou sans barre oblique finale.

Gardez les deux sous la main (Bloc-notes, par exemple).

⚠️ Ne copiez **jamais** la clé `service_role`, juste en dessous : celle-là donne
tous les droits sur votre base. La clé `anon` est faite pour être publique et se
retrouvera dans le code de la page — c'est normal, et ce n'est pas elle qui
protège vos parties (voir la fin de ce document).

## Étape 5 — Brancher l'app, depuis GitHub

Pas besoin de récupérer le projet sur votre ordinateur : GitHub sait modifier un
fichier directement dans le navigateur.

1. Sur GitHub, ouvrez le dépôt, puis le fichier **`src/config.js`**.
2. Cliquez sur le **crayon** (*Edit this file*), en haut à droite du fichier.
3. Remplacez les deux lignes vides par vos valeurs :

```js
export const REMOTE = {
  url: 'https://abcdefgh.supabase.co',
  key: 'eyJ…',
};
```

Gardez bien les guillemets et les virgules.

4. **Commit changes…** → **Commit changes**, en laissant la branche `main`
   sélectionnée.

## Étape 6 — Publier l'app

GitHub Pages demande un dépôt **public** dans l'offre gratuite.

1. **Settings** → **General** → tout en bas, *Danger Zone* → **Change
   visibility** → *Make public*, et confirmez en tapant le nom du dépôt.
   (Le code n'a rien de secret : la clé `anon` est publique par nature, et
   aucune partie n'est stockée dans le dépôt.)
2. **Settings** → **Pages** → sous **Source**, choisissez **GitHub Actions**.
3. Onglet **Actions** : une exécution démarre toute seule. Deux minutes environ.
   Quand elle est verte, l'adresse s'affiche — quelque chose comme
   `https://votre-compte.github.io/Code/`.

**Si vous voulez garder le dépôt privé**, utilisez
[Cloudflare Pages](https://pages.cloudflare.com) à la place : créez un compte,
*Connect to Git*, choisissez le dépôt, laissez la commande de build vide et
indiquez `/` comme dossier à publier. Cela se fait aussi entièrement au
navigateur.

## Étape 7 — Sur le téléphone

Ouvrez l'adresse dans Safari (ou Chrome), puis **Partager → Sur l'écran
d'accueil** : vous avez l'app comme une application.

Vérifiez d'un coup d'œil que tout est branché : sur l'accueil, la ligne sous
**Données** doit dire que les parties sont enregistrées *dans ce navigateur et
dans la base partagée*. Si elle parle seulement du navigateur, l'étape 5 n'a pas
pris — vérifiez `src/config.js` sur GitHub, et que l'exécution dans *Actions*
est bien verte.

Dans une partie, le bouton **Partager** donne le lien à envoyer aux autres
joueurs. Ils ouvrent la partie telle quelle et peuvent y ajouter des manches ;
chaque écran se rafraîchit seul toutes les cinq secondes.

---

### Ce qu'une nouvelle version coûte aux autres : rien

Quand l'app change de version, les personnes du groupe **n'ont rien à refaire** :
ni redemander à entrer, ni recoller une clé, ni réinstaller. Ce qu'un appareil
garde lui reste — sa clé, ses parties, ses listes, ses sondages — et la nouvelle
version arrive d'elle-même (voir la section suivante).

Les seules choses qui obligeraient quelqu'un à recommencer, et elles ne sont
jamais des mises à jour :

| | qui doit refaire quoi |
| --- | --- |
| Une **nouvelle version** de l'app | personne |
| Un **bloc SQL** relancé (étape 2 bis) | personne — il est fait pour se relancer |
| `marque_points_new_group_key(...)` | **tout le monde** : c'est le bouton d'alarme, il coupe toutes les clés, et les liens de retour |
| Le bloc de **remise à zéro** (1 bis) | tout le monde, et ce qui était partagé disparaît de la base |
| **Couper** un appareil (étape 4) | celui-là seulement — et, si c'était le dernier de sa personne, son lien de retour ne sert plus |
| Quelqu'un qui **efface les données du site** ou retire l'app de son écran d'accueil | celui-là seulement, et il perd ce qu'il n'avait jamais partagé |

Un cas mérite d'être connu, parce qu'il ressemble à une panne : si le SQL change
et qu'un appareil tourne encore sur une **vieille version de l'app**, cette
version peut appeler une fonction qui n'existe plus. Elle le dit — « cette app ou
la base n'est pas à jour » — et le remède est *Chercher une mise à jour*, dans
Réglages sous *Données*. Sa clé, elle, n'a jamais cessé d'être valable. Sur votre
appareil, celui qui tient la clé qui fait entrer, le même message renvoie au bloc
SQL, puisque c'est vous qui pouvez le lancer.

### Le lien de retour : revenir sans vous

Accepter quelqu'un fait entrer **une personne**, et non seulement un appareil.
Chacun de ses appareils garde sa propre clé, mais tous appartiennent à la même
personne — et cette personne peut se donner un **lien de retour** : un lien à elle
qui rend une clé neuve à n'importe quel navigateur, sans que personne n'ait à
l'accepter de nouveau.

C'est ce qui répond aux deux cas pénibles : entrer depuis le navigateur de
Messenger puis vouloir la même chose dans Safari, et réinstaller l'app.

**Comment ça se passe, de son côté :** une fois acceptée, la ligne qui l'accueille
lui dit de garder son lien. Le bouton **Mon lien de retour**, dans *Mes groupes*,
le lui affiche — avec un QR code, pratique pour le passer d'un appareil à l'autre.
Elle le garde où elle veut : notes, gestionnaire de mots de passe, message à
elle-même. Ensuite, ouvrir ce lien depuis n'importe quel navigateur suffit : un
bouton, et elle est de retour.

**De votre côté, ce que vous voyez et pouvez faire :** dans *Qui est dans le
groupe*, chaque appareil porte le prénom de sa personne, et la mention « a un lien
de retour ». **Couper le lien** l'annule sans mettre ses appareils dehors —
utile si elle vous dit l'avoir perdu de vue. Elle pourra s'en refaire un depuis un
appareil encore entré ; sinon, une nouvelle invitation. Et **couper son dernier
appareil** coupe aussi son lien : une personne que vous mettez dehors ne revient
pas d'elle-même.

Trois choses à savoir, dites franchement :

- **vous ne voyez jamais ce lien**. Il naît sur l'appareil de la personne : celui
  qui fait entrer ne peut donc pas se faire passer pour elle. Vous pouvez le
  couper, pas le lire ;
- **en refaire un annule le précédent.** Un seul lien vaut par personne à la fois ;
- **c'est un secret durable dans un lien.** Il vivra dans un fil de discussion ou
  un carnet de notes. Il est placé après le `#` de l'adresse — la partie qu'aucun
  navigateur n'envoie à un serveur, donc ni GitHub Pages ni un aperçu de lien ne
  le voient — et chaque retour crée une ligne visible dans *Qui est dans le
  groupe*, que vous pouvez couper. C'est le prix du « revenir sans vous » : à vous
  de juger, groupe par groupe. Votre clé à vous, celle qui fait entrer, n'a pas de
  lien de retour du tout.

### Le piège du navigateur de Messenger

Un lien d'invitation voyage par message — donc il s'ouvre le plus souvent **dans
le navigateur intégré de l'app de messagerie**, pas dans Safari. Or ces
navigateurs gardent leurs fichiers et leur stockage pour eux : entrer dans le
groupe depuis là, c'est y entrer **là seulement**. Safari, à côté, n'en saura
rien, et on ne peut même pas ajouter l'app à l'écran d'accueil depuis ces
navigateurs.

L'app le dit désormais elle-même : quand elle tourne dans le navigateur de
Messenger, Instagram, Facebook, WhatsApp et quelques autres, la page d'entrée et
l'onglet Groupes affichent un avertissement, avec un bouton **Copier ce lien** pour le
coller dans Safari. Rien n'est bloqué — l'avertissement conseille, il n'empêche
pas — parce que la détection se fait sur la signature du navigateur, ce qui est
une heuristique et jamais une certitude.

Le bon ordre, à dire une fois à la personne : **ouvrir le lien dans Safari**
(appui long sur le lien → *Ouvrir dans Safari*), entrer dans le groupe là, **puis**
ajouter l'app à l'écran d'accueil et y entrer aussi — avec sa clé, c'est immédiat.

### L'app de l'écran d'accueil est un deuxième appareil

Ajouter l'app à l'écran d'accueil depuis Safari crée une **installation à part** :
ses fichiers et son stockage sont les siens. Elle s'ouvre donc vide — aucun
groupe, et pas de bouton **⟳**, qui n'apparaît qu'une fois l'appareil dans un
groupe (sans groupe, il n'y a rien à aller chercher). L'app le dit elle-même, dans
*Mes groupes*, quand elle tourne depuis l'écran d'accueil et n'appartient à rien.

Deux façons de la faire entrer :

- **sur votre propre téléphone, le plus simple** : *Groupes* → *Entrer, inviter, gérer* →
  dépliez *Je n'ai pas de code, mais une clé* → collez la clé de Mifa → **Entrer**.
  Vos deux installations tiennent alors la même clé, et toutes deux peuvent
  accepter les demandes ;
- **sinon** : depuis l'app, écrivez votre prénom et **Demander**, puis acceptez la
  demande depuis Safari (qui tient la clé qui fait entrer).

Une fois entrée, elle récupère d'elle-même ce que le groupe partage, et le **⟳**
apparaît dans la barre du haut.

### Quelqu'un que vous invitez et qui veut l'app sur son écran d'accueil

C'est là que ça se passe mal le plus souvent, et l'ordre est tout. L'invitation
est **un lien**, et un lien s'ouvre **toujours dans le navigateur** — jamais dans
une app posée sur un écran d'accueil ; iOS n'offre aucun moyen de lui en ouvrir
un. Donc si la personne entre depuis le lien, puis pose l'app, elle trouve une
app vide et conclut, non sans raison, qu'elle n'y arrive pas.

**Le bon ordre** — celui que la page d'invitation affiche désormais, sous
*Je veux l'app sur mon écran d'accueil* :

1. **poser l'app d'abord**, depuis le lien ouvert dans Safari : Partager →
   *Sur l'écran d'accueil* ;
2. **l'ouvrir depuis l'écran d'accueil** ; elle est vide, c'est normal ;
3. dedans, *Groupes* → *Entrer dans un groupe* → recopier **le nom du groupe et
   les six chiffres** lus sur la page d'invitation, plus son prénom.

Il n'y a alors **qu'une seule demande** à accepter, et c'est la bonne
installation qui entre.

**Si la personne est déjà entrée depuis le navigateur**, le code peut être
dépensé — une invitation pour une seule personne ne vaut qu'une demande. Elle
passe alors par sa clé : dans le navigateur, *Groupes* → son groupe → **Voir ma
clé**, puis dans l'app posée, *Je n'ai pas de code, mais une clé* → coller →
**Entrer**. Ses deux installations tiennent la même clé, ce qui est sans
inconvénient : une clé désigne une personne, pas un appareil.

**Et si vous retirez puis remettez l'app sur l'écran d'accueil ?** Vous ne
réinvitez **personne**. Retirer l'app efface le stockage de *cette installation*
et rien d'autre : les clés des autres sont des lignes dans la base, elles ne
bougent pas, et les autres continuent de se synchroniser entre eux pendant ce
temps. Il n'y a que **votre** installation à faire rentrer, et le plus court est
de recoller la clé.

**Peut-on voir la clé de quelqu'un d'autre ? Non, et personne ne peut** — pas même
vous, qui hébergez la base. Une clé n'y est jamais écrite : la table ne garde
qu'une **empreinte salée** (`key_hash`), de quoi reconnaître la bonne clé sans
pouvoir la reconstituer. Ce que vous voyez d'un appareil, dans *Qui est dans le
groupe*, c'est son étiquette — le prénom donné à la porte, d'où il vient, quand il
est arrivé — et le bouton pour le couper. Jamais son secret.

Donc : **une clé ne se retrouve pas, elle se remplace.** Sur l'appareil qui la
détient encore, *Voir la clé* la relit depuis son propre stockage ; ailleurs, la
seule voie est une nouvelle invitation. C'est voulu : si la base pouvait rendre
les clés, un accès à la base suffirait pour se faire passer pour n'importe quel
appareil du groupe.

Pour l'avoir sous la main : dans *Mes groupes*, **Voir la clé** l'affiche depuis un
appareil qui la détient — à garder dans un gestionnaire de mots de passe. C'est
elle qui fait revenir un de vos appareils sans invitation ni acceptation ; ne
l'envoyez à personne, qui la colle entre.

**Et quand ce sont eux qui réinstallent ?** La même règle, vue de leur côté :
retirer l'app n'efface que *leur* installation. Deux cas, et un seul vous demande
quelque chose :

| | ce qu'il faut faire |
| --- | --- |
| Ils ont **gardé leur clé** (*Voir la clé* → gestionnaire de mots de passe) | ils la recollent, et ils sont revenus — **vous n'avez rien à faire** |
| Ils ne l'ont **pas gardée** | vous leur envoyez un **nouveau lien**, ils écrivent leur prénom, **vous acceptez**. Deux touches chacun |

Dans le second cas, leur ancienne clé reste dans la base sans appareil pour la
porter : une ligne de plus dans *Qui est dans le groupe*, que vous pouvez
**Couper** sans rien déranger. C'est d'ailleurs le bon réflexe si un téléphone est
perdu.

**Le prénom n'ouvre rien.** Ce qui ramène les données, c'est d'appartenir au
groupe : tout ce qui y est partagé est rangé sous le groupe, pas sous une
personne, et un appareil qui revient reçoit l'ensemble — quel que soit le prénom
qu'il a donné. Revenir sous « Alexandre » plutôt que « Alex » ne fait rien perdre.

Le prénom sert à trois choses, et ce sont trois commodités : il **étiquette la
clé** (c'est ce qui vous fait reconnaître la ligne dans *Qui est dans le groupe*),
il est **proposé en premier** dans les listes, sondages et parties créés sur cet
appareil, et il s'affiche quand quelqu'un frappe.

**Les parties, elles, méritent une précision.** À l'intérieur d'une partie, les
scores suivent le joueur de cette partie-là, pas un prénom : la partie revient
entière, avec ses noms et ses points. Mais les **statistiques** traversent les
parties, et là il n'y a que le prénom pour dire qu'« Alice » de janvier et
« Alice » de mars sont la même personne.

L'app est donc indulgente sur l'orthographe — majuscules, accents et espaces sont
ignorés, `alice`, `Alice` et `  ALICE ` ne font qu'une ligne, affichée comme elle
a été écrite la dernière fois. Deux prénoms différents restent deux personnes :
« Alex » n'est pas « Alexandre », et l'app n'a pas à le deviner.

Si quelqu'un revient sous un autre prénom, la réunion se fait d'une touche :
onglet **Parties → Statistiques**, le crayon à côté du nom, **Renommer partout**.
Toutes les parties où il apparaît suivent, et les deux lignes n'en font plus
qu'une. Rien n'est perdu entre-temps — juste deux lignes au lieu d'une.

Dans une liste, les personnes sont des lignes du document lui-même — « Alex » et
ce qui lui est attribué appartiennent à la liste, pas à son téléphone. Elles sont
donc toujours là quand il revient, et il retrouve ses lignes en touchant sa
pastille. Reprendre le même prénom est donc une affaire de **propreté**, pas de
récupération : sinon vous risquez juste de voir « Alex » et « Alexandre » cohabiter
avec le temps — et là, renommer la personne dans la liste suffit.

**Chaque appareil a sa propre clé, et ce ne sont pas les mêmes.** C'est le point à
retenir : quand vous acceptez quelqu'un, le jeton *de son appareil* devient *sa*
clé — la vôtre ne bouge pas et ne lui est jamais montrée. Sa clé à lui voit et
partage, mais **ne fait entrer personne** : la base refuse (« cette cle ne fait pas
entrer ») s'il essaie de lire les demandes, d'accepter, de lister les appareils ou
d'en couper un. *Voir ma clé*, sur son téléphone, lui montre la sienne, et le
dialogue le lui dit en clair.

La seule façon pour quelqu'un d'autre de pouvoir accepter du monde serait que vous
lui donniez **votre** clé, celle qu'a affichée l'éditeur SQL. Ne la donnez à
personne : la donner, c'est donner la porte. (Si c'est délibéré — un deuxième
adulte de la maison qui doit pouvoir accepter —, l'étape 4 montre comment
désigner une autre clé, ce qui vaut mieux que de partager la vôtre.)

> ⚠️ Avant de retirer l'app, deux précautions : **récupérez** (⟳) ou **exportez**
> (*Données*) ce qui n'a jamais été partagé, car cela n'existe que là ; et
> assurez-vous d'avoir la clé ailleurs. Si la seule clé qui fait entrer vivait
> dans cette installation et que vous l'effacez, il ne reste que le bouton
> d'alarme (`marque_points_new_group_key`) — et **lui**, il fait sortir tout le
> monde.

### Quand l'app de l'écran d'accueil montre une version dépassée

Safari et l'app de l'écran d'accueil sont deux installations séparées : chacune
garde ses fichiers de son côté, et l'app posée sur l'écran d'accueil est
**reprise** plutôt que rechargée — elle peut donc rester sur une vieille version
sans que rien ne le dise. Ce que l'app fait désormais d'elle-même :

- elle demande à chaque retour au premier plan s'il existe une version plus
  récente, et **se recharge une fois** quand c'est le cas ;
- chaque fichier qu'elle va chercher est revalidé, au lieu de faire confiance à
  la copie gardée par le navigateur (GitHub Pages autorise dix minutes de
  conservation : c'était assez pour qu'une app tout juste ajoutée s'ouvre sur ce
  que Safari avait sous la main) ;
- l'onglet **Réglages** affiche la **version** en bas, sous *Données*, avec un
  bouton **Chercher une mise à jour** qui dit ce qu'il a trouvé.

La version se lit en deux morceaux, par exemple `v7 · ce24721c` : le premier
change quand il y a quelque chose à annoncer, le second est **calculé à partir des
fichiers eux-mêmes** et bouge à la moindre modification. C'est celui-là qu'on
compare pour savoir si deux appareils tournent sur la même chose — et c'est lui
qui garantit qu'une version publiée est bien vue comme nouvelle, puisque le
fichier du cache change avec elle.

Si malgré cela une installation reste bloquée — c'est arrivé sur iOS avant ces
garde-fous —, la sortie est mécanique :

1. dans l'app, **Réglages → Chercher une mise à jour**, et attendez le
   rechargement ;
2. sinon, ouvrez la page **dans Safari**, tirez vers le bas pour recharger, et
   vérifiez la version affichée ;
3. en dernier recours, **retirez l'app de l'écran d'accueil et rajoutez-la** :
   comparez la version affichée avant et après. Rien n'est perdu au passage, ce
   qui compte est dans la base du groupe — mais **ce qui n'a jamais été partagé
   ne l'est pas** : servez-vous de *Tout récupérer* et du bouton ⟳ avant, ou
   exportez depuis *Données*.

> Ce que je n'ai pas pu éprouver : **iOS et Safari**. Les garde-fous ci-dessus
> sont vérifiés dans Chromium — première visite qui ne se recharge pas, version
> publiée pendant que l'app tourne qui est prise, rechargement unique, ancien
> cache remplacé — et reposent sur des mécanismes standard, mais WebKit a ses
> propres habitudes.

## Étape 8 — L'agenda (facultatif)

Une fois posée, cette étape donne au groupe **une adresse à laquelle les
agendas s'abonnent** : les dates retenues sur les sondages et les lignes qui
portent un jour apparaissent dans l'agenda de chacun, sans rien faire de plus.

Elle est **facultative**. Sans elle, tout le reste marche ; seuls les boutons
*L'agenda du groupe* et *Couper l'adresse* répondront « cette base ne sait pas
encore servir d'agenda ». Le bouton **Ajouter à l'agenda**, lui, marche déjà :
il télécharge un fichier `.ics`, sans passer par la base.

### 1. Déployer la fonction

Le fichier à déployer est dans le dépôt : **`supabase/functions/agenda/index.ts`**.
Il est construit par `npm run bundle` et tient en un seul fichier, exprès — pour
se coller tel quel.

1. Dans Supabase, **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nommez-la **`agenda`**, exactement. L'adresse en dépend.
3. Collez le contenu de `index.ts` à la place de ce que l'éditeur propose —
   **tout le fichier**, voir l'encadré juste en dessous.
4. ⚠️ **Désactivez la vérification du JWT** (*Verify JWT with legacy secret*, ou
   *Enforce JWT Verification*, selon la version de l'écran). C'est le point qui
   casse tout : un agenda qui s'abonne ne peut envoyer aucun en-tête, donc une
   fonction qui exige un JWT lui répondra `401` — et l'agenda dira simplement
   « impossible de s'abonner », sans autre explication.
5. Déployez.

> **Collez le fichier en entier.** C'est le deuxième piège de cette étape,
> après le commutateur du JWT. Un collage qui perd son début est refusé au
> déploiement par un message qui ne dit rien de son vrai motif :
>
> ```
> Failed to deploy edge function: Failed to bundle the function
> (reason: The module's source code could not be parsed:
> Expression expected at file:///tmp/…/source/index.ts:6:1 ]; ~)
> ```
>
> « Expression expected » à la ligne 6 ne veut pas dire que le fichier est
> cassé : il veut dire que ce qui est arrivé chez Supabase **commence au
> milieu**. Le fichier annonce sa longueur dans son propre en-tête (« Le
> fichier fait N lignes ») : comparez-la au compteur de lignes de l'éditeur,
> une fois collé. Si le compte n'y est pas, faites **tout sélectionner** dans
> l'éditeur (`Ctrl`/`Cmd` + `A`), puis recollez.
>
> Le plus sûr est de copier depuis la **version brute** du fichier sur GitHub —
> le bouton **Raw** de `supabase/functions/agenda/index.ts` — qui affiche du
> texte et rien d'autre, sans numéros de ligne ni mise en forme à emporter au
> passage.

> **Le commutateur se remet tout seul.** C'est un défaut connu de Supabase : la
> case *Verify JWT with legacy secret*, désactivée à la main, **revient sur
> « actif » à chaque mise à jour de la fonction**. Revérifiez-la après chaque
> redéploiement — sinon les agendas cessent de se mettre à jour, sans que rien
> ne le dise. Si l'abonnement tombe en panne du jour au lendemain, c'est la
> première chose à regarder, et le test ci-dessous la distingue en dix secondes.
>
> Avec la ligne de commande, le réglage durable est dans `config.toml` —
> `[functions.agenda] verify_jwt = false` — qui lui ne se réinitialise pas ;
> `supabase functions deploy agenda --no-verify-jwt` vaut pour un déploiement.
>
> Supabase a annoncé la dépréciation du « legacy JWT secret » : ce commutateur
> changera peut-être de nom. Ce dont l'agenda a besoin ne change pas — une
> fonction joignable sans en-tête.

La fonction n'a **aucune clé à configurer** : Supabase lui donne l'adresse du
projet et la clé publique toute seule.

### 1 bis. Vérifier le déploiement en dix secondes

Avant même d'ouvrir l'app, ouvrez cette adresse dans un navigateur, **sans rien
après** :

```
https://<votre-projet>.supabase.co/functions/v1/agenda
```

| ce que vous lisez | ce que cela veut dire |
| --- | --- |
| **Adresse incomplète : il manque le jeton.** | la fonction tourne, et le JWT est bien désactivé — tout va bien |
| un JSON parlant d'*authorization* ou de *JWT* | la vérification du JWT est restée active : revoyez l'étape 1 |
| une erreur 404 | la fonction n'est pas déployée, ou pas sous le nom `agenda` |

### 2. Récupérer l'adresse, dans l'app

*Groupes* → **Entrer, inviter, gérer** → **L'agenda du groupe**. L'adresse ressemble à :

```
https://<votre-projet>.supabase.co/functions/v1/agenda/<32 caractères>.ics
```

Elle est **fabriquée à la première demande** et reste la même ensuite.

> **Deux formes de la même adresse.** L'app montre celle qui finit par `.ics` :
> plusieurs applications refusent une adresse qui ne ressemble pas à un fichier
> de calendrier, ou qui porte un `?`. L'ancienne forme — `…/agenda?c=<jeton>` —
> reste servie pour toujours, donc un abonnement déjà pris continue de
> fonctionner. Si l'une passe mal quelque part, essayez l'autre ; et
> `webcal://` à la place de `https://` en est une troisième, que certaines
> applications sont seules à accepter.

### 3. S'abonner

- **iPhone / iPad** : Réglages → Calendrier → Comptes → Ajouter un compte →
  Autre → **Ajouter un calendrier avec abonnement**, puis collez l'adresse.
- **Mac** : Calendrier → Fichier → **Nouvel abonnement à un calendrier**.
- **Google Agenda** (sur ordinateur) : Autres agendas → **+** → *À partir de
  l'URL*.
- **FamilyWall** : *Ajouter un calendrier externe par URL* — **réservé à
  l'abonnement payant**, et leur documentation annonce un rafraîchissement
  toutes les trois heures environ, parfois plus de vingt-quatre. Les agendas
  d'Apple et de Google relisent en quinze à soixante minutes : si le but est que
  tout le monde voie la date vite, l'abonnement direct vaut mieux que le détour.
  Si l'abonnement n'y passe pas malgré un compte payant et les trois formes
  d'adresse, leur propre documentation conseille le détour par le fichier :
  ouvrir l'adresse dans un navigateur — elle télécharge `together.ics` — et
  **importer ce fichier**. Ce n'est plus vivant, mais les dates y sont.

### Ce que l'adresse donne, et ce qu'elle ne donne pas

- Elle donne **les dates** : les sondages qui en ont retenu une, et les lignes
  qui portent un jour et ne sont pas cochées. Rien d'autre — ni les scores, ni
  qui a coché quoi, ni aucune clé.
- **Qui tient l'adresse voit ces dates**, sans rien d'autre à fournir : c'est
  une adresse à envoyer à la famille, pas à publier. Elle se coupe depuis l'app
  (*Couper l'adresse*, sur un appareil qui fait entrer), ce qui arrête d'un
  coup tous les agendas abonnés ; en
  redemander une en fabrique une autre, sans rapport avec la première.
- Les archives et les modèles n'y sont pas : l'agenda est pour ce qui vient.
- **La synchronisation ne va que dans un sens.** Ce qui est écrit dans l'agenda
  de quelqu'un ne revient jamais dans l'app.
- Un jeton ne se devine pas (trente-deux caractères tirés au hasard) : il n'y a
  donc pas de plafond d'essais, qui laisserait des agendas abonnés à une adresse
  coupée faire taire ceux des autres groupes.

> Ce que je n'ai pas pu éprouver : **le déploiement lui-même**, ni aucun agenda
> réel. La fonction et son SQL sont vérifiés ici — sur PostgreSQL 16 pour la
> base, et sur le fichier produit pour la fonction — mais ni Supabase, ni iOS,
> ni FamilyWall ne sont joignables depuis là où je travaille.

## Étape 9 — Les comptes (facultatif)

Sans compte, un appareil garde seul sa clé de groupe et ses droits
d'organisateur : un navigateur qui efface ses données (Safari, après quelques
semaines sans ouvrir le site) les perd. Avec un compte, on se connecte par
e-mail — **sans mot de passe, un code à six chiffres** — et on retrouve ses
groupes et ses sondages sur n'importe quel appareil. C'est facultatif pour
chacun, et les visiteurs d'un lien de sondage n'en voient rien.

Ce que la base garde : l'adresse e-mail (dans Supabase → Authentication →
Users), quelles clés d'appareil sont à quel compte — **jamais une clé en
clair** : un nouvel appareil en reçoit une neuve, comme par un lien de
retour —, et les secrets d'organisateur du compte. Couper toutes les clés d'un
compte dans un groupe (étape 2 bis, 4) le sort du groupe : il ne pourra pas
y revenir en se reconnectant.

### 1. Le SQL

Déjà dans le bloc de l'étape 2 bis (base neuve), et dans
`supabase/mise-a-jour.sql` (base existante) : rien d'autre à passer.

### 2. Faire envoyer un code, pas seulement un lien

Par défaut, Supabase envoie un **lien** de connexion. Un lien s'ouvre dans le
navigateur, jamais dans l'app de l'écran d'accueil : il faut le **code**.

1. Supabase → **Authentication** → **Emails** (ou **Email Templates**).
2. Ouvrez le modèle **Magic Link**. Remplacez le sujet par
   `Votre code Together` et le contenu par :

   ```html
   <h2>Votre code Together</h2>
   <p>Tapez ce code dans l'app : <strong style="font-size:24px">{{ .Token }}</strong></p>
   <p>Il ne sert qu'une fois, et pendant une heure.</p>
   ```

   **Save**.
3. Faites **la même chose** pour le modèle **Confirm signup** : c'est lui qui
   part à une adresse qui se connecte pour la première fois.

### 3. Vérifier que la connexion par e-mail est active

Supabase → **Authentication** → **Sign In / Providers** :

- **Allow new users to sign up** : activé — sinon personne ne peut créer de
  compte ;
- **Email** : activé (c'est le réglage par défaut). Dedans, **Confirm email**
  peut rester activé (le code vaut confirmation), **Email OTP Expiration** à
  `3600` (une heure), et **Email OTP Length** à `6` — l'app en accepte jusqu'à
  dix, mais six se tapent mieux. **Save**.

### 4. L'envoi des e-mails : la limite de Supabase

Le service d'envoi fourni par Supabase est fait pour essayer : il n'envoie
**que quelques e-mails par heure**, pour tout le projet, et — d'après sa
documentation — **seulement aux adresses des membres de l'équipe du projet**
(la vôtre). Pour que vos proches reçoivent leur code, il faut votre propre
service d'envoi :

1. Créez un compte gratuit chez un service d'envoi d'e-mails (Brevo, Resend…)
   et demandez-lui des **identifiants SMTP**.
2. Supabase → **Authentication** → **Emails** → **SMTP Settings** →
   **Enable custom SMTP** : collez l'hôte, le port, l'identifiant et le mot de
   passe donnés par ce service, et une adresse d'expéditeur.
3. **Save**.

### 5. Essayer

Dans l'app : **Réglages → Compte** → votre adresse → **Recevoir un code** → le
code reçu → **Se connecter**. Puis, sur un autre appareil (ou une fenêtre
privée), la même chose : vos groupes et vos sondages y apparaissent.

### 6. Un téléphone perdu, quelqu'un qu'on sort

- **Couper l'appareil** dans le groupe (**Groupes** → **Qui est dans le
  groupe** → **Couper** en face de l'appareil, ou l'étape 2 bis, 4) : si cet appareil était à un
  compte, **ce compte est sorti du groupe** — ni le téléphone coupé ni un
  nouvel appareil ne s'y redonnent de clé en se connectant. Les autres
  appareils de la personne, eux, restent dans le groupe. Pour qu'un nouvel
  appareil y revienne : une invitation, comme au premier jour.
- **La personne elle-même** : **Réglages → Compte → Se déconnecter de tous
  les appareils**, depuis n'importe lequel de ses appareils. Le téléphone
  perdu n'a plus de compte au plus tard une heure après.

## Étape 10 — Les notifications (facultatif)

Une fois posée, cette étape permet à chaque appareil d'**être prévenu** :
un nouveau sondage, une liste, un compte ou un tableau d'idées dans ses
groupes, une date retenue, **la veille d'un événement**, **un mot laissé** sur
un sondage, un événement ou une idée — et, pour qui fait entrer, quelqu'un qui
frappe. Chacun l'active pour lui, dans **Réglages →
Notifications**.

Elle est **facultative**. Sans elle, le bouton *Activer les notifications*
répond « la fonction notifier n'est pas en place », et rien d'autre ne change.

### 1. Le SQL

Il est dans le bloc de l'étape 2 bis (et dans `supabase/mise-a-jour.sql`) :
les tables `marque_points_push…` et leurs fonctions. Rien de plus à passer.

### 2. Déployer la fonction

Le fichier est **`supabase/functions/notifier/index.ts`**, construit par
`npm run bundle`, en un seul fichier comme celui de l'agenda.

1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nommez-la **`notifier`**, exactement.
3. Collez **tout** le contenu de `index.ts` (le plus sûr : bouton « Raw » sur
   GitHub, puis tout sélectionner). L'en-tête dit combien de lignes il fait.
4. **Désactivez la vérification du JWT**, comme pour l'agenda.
5. Déployez.

Aucun secret à régler : la paire de clés qui signe les envois est faite par la
fonction elle-même au premier appel, et gardée dans la base
(`marque_points_push_vapid`, que la page ne lit jamais). La fonction lit les
abonnements avec la clé de service que Supabase donne à toute Edge Function.

### 2 bis. Vérifier le déploiement en dix secondes

Ouvrez cette adresse dans un navigateur, **sans rien après** :

```
https://<votre-projet>.supabase.co/functions/v1/notifier
```

| ce que vous lisez | ce que cela veut dire |
| --- | --- |
| `{"status":"error","message":"POST only"}` | la fonction tourne, et le JWT est bien désactivé — tout va bien |
| un JSON parlant d'*authorization* ou de *JWT* | la vérification du JWT est restée active : revoyez le point 4 ci-dessus |
| *Requested function was not found* (une erreur 404) | la fonction n'est pas déployée, ou pas sous le nom `notifier` |

### 3. Essayer

Sur un téléphone, **l'app posée sur l'écran d'accueil** (sur iPhone, c'est
obligatoire : Safari seul ne reçoit pas de notifications ; iOS 16.4 ou plus) :
Réglages → Notifications → **Activer les notifications** → Autoriser. Puis,
depuis un autre appareil du groupe, créez un sondage : le téléphone sonne.
Sur un ordinateur (Windows, Mac), Edge, Chrome et Firefox les reçoivent
directement, sans installer l'app.

Si l'activation échoue, l'app dit pourquoi, sous le bouton : la fonction pas
en place (point 2), la base sans ses tables (le SQL du point 1), ou un
navigateur que son service d'envoi refuse (Brave sans le service de Google, un
réseau d'entreprise, un VPN). Le « Détail », en petit, est ce que le navigateur
ou la base a répondu : c'est lui qu'il faut transmettre si rien de cela ne
colle.

Ce qu'une notification contient (le nom du groupe, le titre du document, la
date) est chiffré pour l'appareil qui la reçoit : le service d'envoi
(Apple, Google, Microsoft, Mozilla) ne la lit pas.

### 4. Le rappel de la veille : rien à faire

La veille d'un événement, **entre 18 h et 23 h à l'heure de chaque
appareil**, ceux du groupe reçoivent « Demain : Raclette à 20:00. Reste à
faire : 2 lignes à cocher, 1 sondage ouvert. » — une fois. Pour un séjour
déjà commencé, ce sont ses activités du lendemain (« Demain, pendant
« Vacances » : Kayak à 10:00 »). Pas de rappel pour une date annoncée il y a
moins de douze heures : on vient de l'apprendre.

Quelqu'un doit demander, une fois l'heure, s'il y a un rappel à envoyer :
c'est **GitHub**, qui le fait tout seul (onglet **Actions** du dépôt →
**Rappels de la veille**). Chaque course dit dans son journal ce que la
fonction a répondu (`"reminders":1,"sent":3`), ou ce qui manque : la fonction
`notifier` à recoller (point 2), la mise à jour SQL à passer. Elle n'échoue
jamais, pour ne pas vous envoyer un e-mail par heure. L'app, ouverte le soir,
demande aussi : un rappel n'est envoyé qu'une fois, quel que soit qui demande.

> **Si les rappels s'arrêtent** après deux mois sans aucun changement dans le
> dépôt : GitHub met alors en pause les tâches à heure fixe. **Actions →
> Rappels de la veille → Enable workflow** les relance.

## Étape 11 — Les changements en direct (rien à faire, en principe)

Le bloc SQL de l'étape 2 bis fait annoncer chaque écriture par la base sur
**Supabase Realtime** : l'app ouverte voit les votes, les lignes cochées et les
nouveaux documents arriver aussitôt, au lieu de toutes les 5 à 20 secondes.
L'annonce ne contient rien (ni titre, ni identifiant) ; le canal d'un groupe a
un nom secret.

Realtime est actif par défaut. Si un jour **Realtime → Settings** propose
*« Allow public access »* (ou *« Private channels only »*), il faut que les
canaux publics restent permis. S'ils ne le sont pas, rien ne casse : l'app
revient d'elle-même à sa relève de quelques secondes.

## Ce que ce montage implique

- **Rien ne part tout seul.** Une partie reste sur l'appareil qui l'a créée
  jusqu'à ce que quelqu'un appuie sur *Partager* — y compris chez les personnes
  à qui vous donnez l'adresse de l'app. Si vous hébergez la base, cochez
  *Envoyer mes nouvelles parties dans la base partagée* dans la section
  **Données** : vos appareils à vous enverront tout d'emblée, les autres non.
- **Qui a le lien a tous les droits** sur cette partie : la lire, y ajouter des
  manches, la supprimer. Il n'y a ni compte ni mot de passe — le lien *est* la
  clé, comme un document partagé « par lien ».
- **Une partie ne se trouve pas par hasard.** Son identifiant est un nombre
  aléatoire de 122 bits, et la table n'est pas listable, même avec la clé
  publique.
- **La clé publique permet d'écrire.** Quelqu'un qui la récupère dans le code de
  la page pourrait écrire de fausses parties dans la base. Il ne verrait pas les
  vôtres pour autant. Les garde-fous du script SQL limitent la casse ; le cas
  échéant, régénérez la clé depuis Supabase et refaites l'étape 5.
- **Un groupe est une clé.** Qui l'a peut partager dans ce groupe et voir tout
  ce qui y est partagé ; qui ne l'a pas ne peut rien y créer. La clé se colle sur
  chaque appareil, et se renouvelle en une requête si elle fuite.
- **Un groupe ne voit pas un autre groupe.** C'est vrai au niveau de la base, pas
  seulement à l'écran : `marque_points_group_docs` ne rend que les documents dont
  le `group_id` correspond à la clé présentée. La clé des *Copains* ne liste rien
  de *Mifa*, n'en connaît aucun identifiant, et n'a aucun moyen d'en découvrir.
  Le groupe d'un document est fixé à sa **première** écriture et ne bouge plus :
  une écriture ultérieure, avec n'importe quelle clé, ne le déplace pas.
- **« Lien seulement »** : un document créé avec la clé d'un de vos groupes —
  c'est elle qui vous garde le droit de le supprimer, et qui tient les inconnus
  hors de la base — mais que la base ne liste pour aucun groupe : ni ses
  onglets, ni son agenda. Seuls ceux qui reçoivent le lien le voient. C'est
  fixé à la création : quelqu'un qui a le lien ne peut pas le faire apparaître
  dans le groupe. Revers : vos autres appareils ne le reçoivent pas non plus
  d'eux-mêmes — ouvrez-y le lien.
- **Un sondage a un organisateur** : l'appareil qui l'a créé. Lui seul règle
  la date, clôt, change la question ou les choix, gère les personnes et
  supprime. Les autres — membres du groupe comme visiteurs d'un lien — voient
  la grille, la jauge et la date retenue (qu'ils peuvent ajouter à leur
  agenda), votent, peuvent s'ajouter eux-mêmes à la liste et proposer un
  choix de plus (tant que la date n'est pas retenue) et retirer ceux qu'ils ont
  ajoutés ; ils ne renomment rien et ne retirent rien d'autre. La base l'impose aussi : elle ne garde du secret de
  l'organisateur qu'une empreinte, et reprend tel quel ce qu'il a réglé quand
  quelqu'un d'autre écrit — même avec la clé du groupe. Revers : le secret
  vit sur l'appareil qui a créé le sondage ; un autre de vos appareils y est
  un simple votant. Les sondages créés avant restent réglables par tous.
- **La seule porte entre deux groupes est un lien envoyé à la main.** Lire un
  document par son identifiant ne demande aucune clé — c'est ce qui permet
  d'envoyer un sondage à quelqu'un qui n'est dans aucun groupe. L'identifiant
  fait 122 bits d'aléa et ne se devine pas ; mais qui le reçoit peut lire, quel
  que soit son groupe. Un lien envoyé est une porte ouverte, et c'est vous qui
  l'ouvrez.
- **Copier, oui ; déplacer, non.** L'app copie un document vers un autre groupe :
  nouvel identifiant, nouvelle ligne, l'original ne bouge pas. Elle ne le
  *déplace* pas, et ce n'est pas un oubli — le groupe étant fixé à la première
  écriture, un déplacement devrait effacer la ligne d'origine, et n'importe quel
  autre appareil du premier groupe, qui en garde une copie locale, la
  réécrirait là-bas à sa prochaine modification. Tant que la base ne sait pas
  dire « ce document a quitté ce groupe », déplacer serait une promesse qu'on ne
  peut pas tenir.
- **Contribuer ne demande rien.** Un lien envoyé à quelqu'un d'extérieur lui
  permet d'ajouter une manche, de cocher une ligne, de répondre à un sondage —
  et rien d'autre : il ne voit pas le reste du groupe et ne peut rien partager.
- **Un lot de parties** — le lien qui en apporte plusieurs d'un coup — se crée
  avec la clé d'un groupe et s'ouvre avec son code à six chiffres, dix essais au
  maximum. Il ne contient pas les documents, seulement la liste chiffrée de leurs
  identifiants : même en lisant la ligne dans la base, on ne sait pas ce qu'il
  désigne. Le chiffrement demande https (l'adresse de l'app en est une) ; sur une
  adresse en http, la liste est stockée en clair et l'app le dit.
- **Le code est à dire, pas à écrire dans le même message.** Un lien et son code
  envoyés ensemble ne protègent plus rien : le bouton *Copier* ne copie que le
  lien, exprès.
- **Révoquer un partage** se fait depuis *Mes partages*, dans l'onglet Réglages :
  le lien ne donne plus rien à personne, même avec le bon code.
- **Une partie ouverte par un lot reste ouvrable par son propre lien** ensuite :
  le code protège le lot, pas chaque partie pour toujours.
- **Les dix essais peuvent être gâchés** par quelqu'un à qui le lien est parvenu
  sans le code : le lot se ferme, et il faut en refaire un.
- **Sans configuration, rien ne change** : `src/config.js` laissé vide, l'app
  garde tout dans le navigateur et n'envoie rien nulle part. Le fichier autonome
  `dist/marque-points.html` reste utilisable hors ligne dans tous les cas.
- **Limites de l'offre gratuite Supabase** : 500 Mo de base, et une mise en
  veille du projet après une semaine sans activité — il se réveille tout seul à
  la requête suivante, avec quelques secondes de retard. Une partie pèse
  quelques kilo-octets : vous n'atteindrez jamais la limite.

## Annexe — vérifier depuis un terminal

Facultatif, et réservé à qui a déjà le projet et Node.js :

```bash
node tools/check-remote.js https://abcdefgh.supabase.co eyJ…
```

Sous **Windows**, dans PowerShell, `curl` n'est pas le vrai curl mais un alias :
écrivez `curl.exe`, ou utilisez la commande native :

```powershell
$url = "https://abcdefgh.supabase.co"
$key = "eyJ…"
$headers = @{ apikey = $key; Authorization = "Bearer $key" }
Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/marque_points_get" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"p_id":"test_marque_points"}'
```

La vérification de l'étape 3, faite dans l'éditeur SQL de Supabase, couvre
l'essentiel : ces commandes ne servent qu'à tester en plus le chemin réseau et
la clé.
