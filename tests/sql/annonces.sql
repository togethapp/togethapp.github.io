\pset tuples_only on
-- Un faux Supabase Realtime : realtime.send note ce qu'on lui confie.
create schema if not exists realtime;
create table realtime.heard (topic text, event text, payload jsonb, private boolean);
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language sql as
  $f$ insert into realtime.heard values (topic, event, payload, private) $f$;

do $$
declare
  v_key text; v_group text; v_channel text; v_code text; v_n integer; v_heard text[];
begin
  select cle into v_key from public.marque_points_new_group('Mifa');
  select id into v_group from public.marque_points_group where name = 'Mifa';

  -- 1. la clé donne le nom du canal du groupe, tiré au hasard
  v_channel := public.marque_points_group_of(v_key)->>'channel';
  if v_channel ~ '^[0-9a-f]{32}$' then raise notice 'OK 1 : la clé donne le canal du groupe';
  else raise notice 'ÉCHEC 1 : %', v_channel; end if;

  -- 2. écrire annonce, sur le canal du document et sur celui du groupe, sans rien dire
  perform public.marque_points_put('l_courses_1', '{"kind":"list","id":"l_courses_1","items":[]}'::jsonb, v_key);
  select array_agg(topic order by topic) into v_heard from realtime.heard;
  if v_heard = array['doc-l_courses_1', 'group-' || v_channel]
     and not exists (select 1 from realtime.heard where payload <> '{}'::jsonb or private or event <> 'changed') then
    raise notice 'OK 2 : une écriture s''annonce, vide, sur des canaux publics';
  else raise notice 'ÉCHEC 2 : %', v_heard; end if;

  -- 3. et chaque écriture suivante aussi
  delete from realtime.heard;
  perform public.marque_points_put('l_courses_1', '{"kind":"list","id":"l_courses_1","items":[{"id":"i1"}]}'::jsonb, v_key);
  select array_agg(topic order by topic) into v_heard from realtime.heard;
  if v_heard = array['doc-l_courses_1', 'group-' || v_channel] then raise notice 'OK 3 : une modification aussi';
  else raise notice 'ÉCHEC 3 : %', v_heard; end if;

  -- 4. un « lien seulement » ne s'annonce que sur son propre canal
  delete from realtime.heard;
  perform public.marque_points_put('v_voisins_1',
    '{"kind":"poll","id":"v_voisins_1","question":"Quel soir ?","linkOnly":true,"people":[],"options":[],"votes":{}}'::jsonb, v_key);
  select array_agg(topic order by topic) into v_heard from realtime.heard;
  if v_heard = array['doc-v_voisins_1'] then raise notice 'OK 4 : un « lien seulement » ne dit rien au groupe';
  else raise notice 'ÉCHEC 4 : %', v_heard; end if;

  -- 5. supprimer s'annonce
  delete from realtime.heard;
  perform public.marque_points_delete('l_courses_1', v_key);
  select array_agg(topic order by topic) into v_heard from realtime.heard;
  if v_heard = array['doc-l_courses_1', 'group-' || v_channel] then raise notice 'OK 5 : une suppression s''annonce';
  else raise notice 'ÉCHEC 5 : %', v_heard; end if;

  -- 6. quelqu'un qui frappe s'annonce au groupe
  delete from realtime.heard;
  v_code := public.marque_points_invite(v_key, 60, 1)->>'code';
  perform public.marque_points_ask('Mifa', v_code, 'Paul', 'téléphone');
  select array_agg(topic) into v_heard from realtime.heard;
  if v_heard = array['group-' || v_channel] then raise notice 'OK 6 : qui frappe est annoncé au groupe';
  else raise notice 'ÉCHEC 6 : %', v_heard; end if;

  -- 7. deux groupes, deux canaux
  perform public.marque_points_new_group('Voisins');
  select count(distinct channel) into v_n from public.marque_points_group;
  if v_n = 2 then raise notice 'OK 7 : chaque groupe a son canal';
  else raise notice 'ÉCHEC 7'; end if;
end;
$$;

-- 8. Realtime en panne : l'écriture passe quand même.
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language plpgsql as $f$ begin raise exception 'realtime en panne'; end $f$;
do $$
declare v_key text;
begin
  v_key := public.marque_points_new_group_key('Mifa');
  perform public.marque_points_put('l_panne_1', '{"kind":"list","id":"l_panne_1","items":[]}'::jsonb, v_key);
  if public.marque_points_get('l_panne_1') is not null then raise notice 'OK 8 : Realtime en panne, l''écriture passe';
  else raise notice 'ÉCHEC 8'; end if;
end;
$$;

-- 9. Pas de Realtime du tout : pareil.
drop schema realtime cascade;
do $$
declare v_key text;
begin
  v_key := public.marque_points_new_group_key('Mifa');
  perform public.marque_points_put('l_sans_1', '{"kind":"list","id":"l_sans_1","items":[]}'::jsonb, v_key);
  if public.marque_points_get('l_sans_1') is not null then raise notice 'OK 9 : sans Realtime, l''écriture passe';
  else raise notice 'ÉCHEC 9'; end if;
end;
$$;

-- 10. Personne ne peut annoncer à la place de la base.
do $$
begin
  if not has_function_privilege('anon', 'public.marque_points_announce(text)', 'execute')
     and not has_function_privilege('anon', 'public.marque_points_live()', 'execute') then
    raise notice 'OK 10 : la clé publique ne peut pas annoncer';
  else raise notice 'ÉCHEC 10'; end if;
end;
$$;
