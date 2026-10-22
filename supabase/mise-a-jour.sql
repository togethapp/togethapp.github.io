-- Mise à jour d'une base déjà en place — à passer une fois, en entier.
--
-- Supabase → SQL Editor → New query → collez tout ce fichier → Run.
-- Réponse attendue : « Success. No rows returned ».
--
-- Sans danger à repasser : rien ici n'efface de données, et tout ce qui
-- existe déjà est remplacé en place. Ce que ça apporte :
--
--   1. les invitations valent deux jours au lieu d'un ;
--   2. « Lien seulement » : un document que seuls ceux qui ont le lien voient,
--      absent des onglets et de l'agenda du groupe ;
--   3. l'organisateur : qui crée un sondage garde seul la main sur la date,
--      la clôture, la question, les choix et la suppression ; les autres
--      votent, et s'ajoutent eux-mêmes ;
--   4. un sondage se fond case par case au lieu d'être remplacé : une copie
--      en retard n'efface plus les votes arrivés entre-temps ;
--   5. ce qui est supprimé ne revient plus : un téléphone qui gardait un
--      sondage supprimé ne peut plus le recréer, ni le ranger dans un autre
--      groupe ; et un sondage clos ne prend plus de votes ;
--   6. les comptes, facultatifs : se connecter par e-mail retrouve ses
--      groupes et ses droits d'organisateur sur tout nouvel appareil ; et
--      chacun peut supprimer son compte et son adresse ;
--   7. un groupe peut exiger un compte : sans compte, un appareil n'y voit
--      plus ce qui est partagé, n'y partage plus et n'y invite plus ;
--   8. qui répond à un sondage par un lien peut y ajouter des choix, et
--      retirer ceux qu'il a ajoutés ;
--   9. l'agenda d'un groupe ne se tait plus parce qu'un autre agenda frappe à
--      une adresse coupée ; un groupe qui exige un compte ferme aussi son
--      agenda, la suppression et les lots aux clés sans compte ; seule une clé
--      qui fait entrer coupe l'agenda ; un lot ne se retire qu'avec une clé de
--      son groupe ; un sondage ne grossit plus sans fin sous les envois des
--      visiteurs ;
--  10. les changements arrivent aussitôt : la base annonce chaque écriture
--      sur Supabase Realtime (une annonce vide, sur un canal secret par
--      groupe), au lieu que l'app redemande toutes les quelques secondes ;
--  11. les notifications : un appareil qui les active est prévenu d'un
--      nouveau document dans ses groupes, d'une date retenue, et — s'il fait
--      entrer — de quelqu'un qui frappe (avec la fonction « notifier »).
--  12. couper le dernier appareil d'une personne — ou tout le groupe, avec le
--      bouton d'alarme — coupe aussi son lien de retour ; et taper des codes
--      au hasard ne bloque plus les liens de retour de tout le monde, ni ne
--      dit quels codes existent ;
--  13. le rappel de la veille : la veille d'un événement, entre 18 h et 23 h
--      à l'heure de chaque appareil, ce qui a lieu demain et ce qui reste à
--      faire (avec la fonction « notifier », appelée une fois l'heure) ;
--  14. les réactions et les mots : sur un sondage, un événement ou une
--      activité, ceux de chacun se fondent, comme les votes — et restent
--      permis sur ce qui est clos.
--
-- Généré depuis docs/DEPLOIEMENT.md, étape 2 bis ; un test vérifie que les
-- deux disent la même chose. Modifiez le guide, pas ce fichier seul.

-- 6 et 7. Les comptes, et les groupes qui en exigent un : les colonnes d'abord,
-- que les fonctions ci-dessous lisent.
alter table public.marque_points_group_key
  add column if not exists user_id uuid;
create index if not exists marque_points_group_key_user on public.marque_points_group_key (user_id);

alter table public.marque_points_group
  add column if not exists accounts_required boolean not null default false;

-- 10. Le canal de chaque groupe, que la fonction suivante donne.
alter table public.marque_points_group
  add column if not exists channel text not null default replace(gen_random_uuid()::text, '-', '');

-- 1. Deux jours pour une invitation.
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

-- 2. « Lien seulement », et 3. l'organisateur.
alter table public.marque_points_games
  add column if not exists listed boolean not null default true;

alter table public.marque_points_games
  add column if not exists owner_hash text;

-- 4. Les votes fondus case par case.
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

-- 5. La trace de ce qui a été supprimé : des identifiants, rien du contenu.
create table if not exists public.marque_points_gone (
  id text primary key,
  gone_at timestamptz not null default now()
);
alter table public.marque_points_gone enable row level security;

-- Les versions précédentes de l'écriture et de la suppression : remplacées
-- ci-dessous par des versions qui connaissent l'organisateur. Les laisser
-- ferait deux fonctions du même nom, entre lesquelles la base refuserait de
-- choisir. Ce sont des fonctions, pas des données : rien n'est perdu.
drop function if exists public.marque_points_put(text, jsonb, text);
drop function if exists public.marque_points_delete(text, text);

-- 8. Les choix qu'ajoutent les visiteurs.
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

-- 9. L'agenda, et ce qu'un groupe qui exige un compte ferme aussi.
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

-- Les mêmes droits qu'avant, sur les nouvelles versions, rien de plus ;
-- et la fonte des votes n'est qu'un outil de l'écriture, pas une porte.
grant execute on function public.marque_points_invite(text, integer, integer) to anon, authenticated;
grant execute on function public.marque_points_put(text, jsonb, text, text) to anon, authenticated;
grant execute on function public.marque_points_delete(text, text, text) to anon, authenticated;
grant execute on function public.marque_points_group_docs(text) to anon, authenticated;
grant execute on function public.marque_points_agenda(text) to anon, authenticated;
grant execute on function public.marque_points_calendar(text) to anon, authenticated;
grant execute on function public.marque_points_forget_calendar(text) to anon, authenticated;
grant execute on function public.marque_points_put_set(text, jsonb, text, text) to anon, authenticated;
grant execute on function public.marque_points_forget_set(text, text) to anon, authenticated;
revoke all on function public.marque_points_merge_votes(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.marque_points_add_options(jsonb, jsonb, jsonb) from public, anon, authenticated;

-- 6. Les comptes : les secrets d'organisateur.
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

-- 7. Exiger un compte dans un groupe.
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

-- 10. Les changements annoncés aussitôt.
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

-- 11. Les notifications.
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

create table if not exists public.marque_points_push_sent (
  doc_id text not null,
  event text not null,
  sent_at timestamptz not null default now(),
  primary key (doc_id, event)
);
alter table public.marque_points_push_sent enable row level security;

create table if not exists public.marque_points_push_vapid (
  id integer primary key default 1 check (id = 1),
  public_key text not null,
  private_jwk jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.marque_points_push_vapid enable row level security;

-- 13. Le fuseau de chaque appareil, pour le rappel de la veille ; et l'abonnement
-- qui le dit, à la place de celui d'avant, sans fuseau.
alter table public.marque_points_push
  add column if not exists tz text not null default 'Europe/Paris';
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

create or replace function public.marque_points_push_gone(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.marque_points_push where endpoint = p_endpoint;
$$;

-- Pour les comptes connectés seulement, pas pour la clé publique de la page.
revoke all on function public.marque_points_account_link(text, text) from public, anon;
revoke all on function public.marque_points_account_owner_put(text, text) from public, anon;
revoke all on function public.marque_points_account_restore(jsonb, text) from public, anon;
revoke all on function public.marque_points_account_leave(text) from public, anon;
revoke all on function public.marque_points_account_delete() from public, anon;
grant execute on function public.marque_points_account_link(text, text) to authenticated;
grant execute on function public.marque_points_account_owner_put(text, text) to authenticated;
grant execute on function public.marque_points_account_restore(jsonb, text) to authenticated;
grant execute on function public.marque_points_account_leave(text) to authenticated;
grant execute on function public.marque_points_account_delete() to authenticated;
revoke all on function public.marque_points_account_cut_mark() from public, anon, authenticated;
revoke all on function public.marque_points_announce(text) from public, anon, authenticated;
revoke all on function public.marque_points_live() from public, anon, authenticated;
grant execute on function public.marque_points_push_subscribe(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.marque_points_push_unsubscribe(text) to anon, authenticated;
grant execute on function public.marque_points_open_set(text, text) to anon, authenticated;
revoke all on function public.marque_points_push_vapid(text, jsonb) from public, anon, authenticated;
revoke all on function public.marque_points_push_event(text, text) from public, anon, authenticated;
revoke all on function public.marque_points_push_knock(text) from public, anon, authenticated;
revoke all on function public.marque_points_push_reminders() from public, anon, authenticated;
revoke all on function public.marque_points_push_gone(text) from public, anon, authenticated;
grant execute on function public.marque_points_push_vapid(text, jsonb) to service_role;
grant execute on function public.marque_points_push_event(text, text) to service_role;
grant execute on function public.marque_points_push_knock(text) to service_role;
grant execute on function public.marque_points_push_reminders() to service_role;
grant execute on function public.marque_points_push_gone(text) to service_role;
grant execute on function public.marque_points_group_of(text) to anon, authenticated;
grant execute on function public.marque_points_group_keys(text) to anon, authenticated;
grant execute on function public.marque_points_set_accounts(text, boolean) to anon, authenticated;

-- 12. Une personne sans plus aucun appareil perd son lien de retour ; les codes
-- inconnus ne se comptent plus, et les retours n'ont plus de plafond.
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

revoke all on function public.marque_points_person_out() from public, anon, authenticated;
grant execute on function public.marque_points_ask(text, text, text, text) to anon, authenticated;
grant execute on function public.marque_points_return(text, text) to anon, authenticated;
