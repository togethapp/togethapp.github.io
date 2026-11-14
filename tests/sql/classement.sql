\pset tuples_only on
do $$
declare
  v_admin text; v_group text; v_other text; v_out jsonb;
begin
  select cle into v_admin from public.marque_points_new_group('Mifa');
  select id into v_group from public.marque_points_group where name = 'Mifa';
  insert into public.marque_points_group_key (id, group_id, label, key_hash, key_salt, admits)
  values ('k_paul', v_group, 'Paul', md5('cle-paul' || 'sel'), 'sel', false);
  select cle into v_other from public.marque_points_new_group('Autres');

  -- 1. une clé inconnue n'écrit ni ne lit rien
  v_out := public.marque_points_arcade_score('nimporte', 'snake', 'normal', 'Gui', 100);
  if v_out->>'status' = 'key' and public.marque_points_arcade_top('nimporte', 'snake', 'normal') = '[]'::jsonb then
    raise notice 'OK 1 : sans clé du groupe, rien';
  else raise notice 'ÉCHEC 1 : %', v_out; end if;

  -- 2. une clé simple du groupe écrit ; le classement revient, trié
  perform public.marque_points_arcade_score('cle-paul', 'snake', 'normal', 'Paul', 120);
  v_out := public.marque_points_arcade_score(v_admin, 'snake', 'normal', 'Gui', 300);
  if v_out->>'status' = 'ok' and v_out->'top'->0->>'name' = 'Gui' and v_out->'top'->1->>'name' = 'Paul'
     and jsonb_array_length(v_out->'top') = 2 then
    raise notice 'OK 2 : chacun écrit, le meilleur en tête';
  else raise notice 'ÉCHEC 2 : %', v_out; end if;

  -- 3. un score plus bas ne remplace rien ; un plus haut, si (même prénom autrement écrit)
  perform public.marque_points_arcade_score(v_admin, 'snake', 'normal', 'gui', 50);
  v_out := public.marque_points_arcade_score(v_admin, 'snake', 'normal', ' GUI ', 400);
  if (v_out->'top'->0->>'score')::int = 400 and jsonb_array_length(v_out->'top') = 2 then
    raise notice 'OK 3 : un seul record par prénom, le meilleur';
  else raise notice 'ÉCHEC 3 : %', v_out; end if;

  -- 4. un autre jeu, une autre difficulté, un autre groupe : à part
  perform public.marque_points_arcade_score(v_admin, 'snake', 'easy', 'Gui', 900);
  perform public.marque_points_arcade_score(v_other, 'snake', 'normal', 'Zoé', 9999);
  if jsonb_array_length(public.marque_points_arcade_top(v_admin, 'snake', 'normal')) = 2
     and jsonb_array_length(public.marque_points_arcade_top(v_admin, 'glouton', 'normal')) = 0
     and (public.marque_points_arcade_top(v_admin, 'snake', 'easy')->0->>'score')::int = 900 then
    raise notice 'OK 4 : chaque jeu, difficulté et groupe a son classement';
  else raise notice 'ÉCHEC 4 : %', public.marque_points_arcade_top(v_admin, 'snake', 'normal'); end if;

  -- 5. ce qui n'a pas de sens est refusé
  if public.marque_points_arcade_score(v_admin, 'tetris', 'normal', 'Gui', 10)->>'status' = 'invalid'
     and public.marque_points_arcade_score(v_admin, 'snake', 'facile', 'Gui', 10)->>'status' = 'invalid'
     and public.marque_points_arcade_score(v_admin, 'snake', 'normal', '  ', 10)->>'status' = 'invalid'
     and public.marque_points_arcade_score(v_admin, 'snake', 'normal', 'Gui', -5)->>'status' = 'invalid' then
    raise notice 'OK 5 : jeu, difficulté, prénom et score vérifiés';
  else raise notice 'ÉCHEC 5'; end if;

  -- 6. un groupe qui fixe ses prénoms : seulement les siens, écrits comme la liste
  perform public.marque_points_set_people(v_admin, '["Gui", "Alice"]'::jsonb);
  v_out := public.marque_points_arcade_score(v_admin, 'glouton', 'hard', 'Bob', 10);
  if v_out->>'status' = 'name'
     and public.marque_points_arcade_score(v_admin, 'glouton', 'hard', 'alice', 10)->'top'->0->>'name' = 'Alice' then
    raise notice 'OK 6 : prénoms fixés, seulement eux';
  else raise notice 'ÉCHEC 6 : %', v_out; end if;

  -- 7. un groupe qui exige un compte : une clé sans compte n'y joue plus
  update public.marque_points_group set accounts_required = true where id = v_group;
  if public.marque_points_arcade_score('cle-paul', 'snake', 'normal', 'Paul', 5000)->>'status' = 'key'
     and public.marque_points_arcade_top('cle-paul', 'snake', 'normal') = '[]'::jsonb then
    raise notice 'OK 7 : sans compte, ni écrire ni lire là où il en faut un';
  else raise notice 'ÉCHEC 7'; end if;
  update public.marque_points_group set accounts_required = false where id = v_group;

  -- 8. le groupe supprimé, son classement aussi
  delete from public.marque_points_group where id = v_group;
  if not exists (select 1 from public.marque_points_arcade where group_id = v_group) then
    raise notice 'OK 8 : le classement part avec le groupe';
  else raise notice 'ÉCHEC 8'; end if;
end;
$$;
