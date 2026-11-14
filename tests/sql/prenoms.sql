\pset tuples_only on
do $$
declare
  v_admin text; v_group text; v_out jsonb; v_code text; v_ticket text; v_uses integer;
begin
  select cle into v_admin from public.marque_points_new_group('Mifa');
  select id into v_group from public.marque_points_group where name = 'Mifa';
  insert into public.marque_points_group_key (id, group_id, label, key_hash, key_salt, admits)
  values ('k_paul', v_group, 'Paul', md5('cle-paul' || 'sel'), 'sel', false);

  -- 1. rien de fixé : la liste est vide, et on entre sous le prénom qu'on veut
  if (public.marque_points_group_of(v_admin))->'people' = '[]'::jsonb then
    raise notice 'OK 1 : un groupe ne fixe aucun prénom tant qu''on ne le lui demande pas';
  else raise notice 'ÉCHEC 1 : %', public.marque_points_group_of(v_admin); end if;

  -- 2. une clé qui ne fait pas entrer ne fixe rien
  begin
    perform public.marque_points_set_people('cle-paul', '["Paul"]'::jsonb);
    raise notice 'ÉCHEC 2 : une clé simple a fixé les prénoms';
  exception when others then
    raise notice 'OK 2 : seule une clé qui fait entrer fixe les prénoms';
  end;

  -- 3. fixés : nettoyés, une fois chacun, dans l'ordre donné
  v_out := public.marque_points_set_people(v_admin, '["Gui", " Alice ", "gui", "", "Léa", "ALICE"]'::jsonb);
  if v_out->>'status' = 'ok' and v_out->'people' = '["Gui", "Alice", "Léa"]'::jsonb
     and (public.marque_points_group_of('cle-paul'))->'people' = '["Gui", "Alice", "Léa"]'::jsonb then
    raise notice 'OK 3 : la liste est gardée propre, et tout le groupe la lit';
  else raise notice 'ÉCHEC 3 : %', v_out; end if;

  -- 4. autre chose qu'une liste est refusé, sans rien changer
  v_out := public.marque_points_set_people(v_admin, '"Gui"'::jsonb);
  if v_out->>'status' = 'invalid' and jsonb_array_length((public.marque_points_group_of(v_admin))->'people') = 3 then
    raise notice 'OK 4 : ce qui n''est pas une liste ne change rien';
  else raise notice 'ÉCHEC 4 : %', v_out; end if;

  -- 5. frapper sous un prénom hors liste : la liste revient, rien n'est consommé
  v_code := public.marque_points_invite(v_admin, 60, 1)->>'code';
  v_out := public.marque_points_ask('Mifa', v_code, 'Alicia', 'téléphone');
  select uses into v_uses from public.marque_points_invite where code = v_code;
  if v_out->>'status' = 'who' and v_out->'people' = '["Gui", "Alice", "Léa"]'::jsonb and v_uses = 1
     and jsonb_array_length(public.marque_points_requests(v_admin)) = 0 then
    raise notice 'OK 5 : un prénom hors liste reçoit la liste ; ni invitation ni demande consommée';
  else raise notice 'ÉCHEC 5 : % (uses %)', v_out, v_uses; end if;

  -- 6. sous un prénom de la liste, écrit autrement : la demande part, écrite comme la liste
  v_out := public.marque_points_ask('Mifa', v_code, ' alice ', 'téléphone');
  if v_out->>'status' = 'waiting' and (public.marque_points_requests(v_admin))->0->>'name' = 'Alice' then
    raise notice 'OK 6 : la demande porte le prénom tel que la liste l''écrit';
  else raise notice 'ÉCHEC 6 : % / %', v_out, public.marque_points_requests(v_admin); end if;

  -- 7. acceptée : la clé dit qui elle est dans le groupe
  v_ticket := v_out->>'ticket';
  perform public.marque_points_answer(v_admin, (public.marque_points_requests(v_admin))->0->>'id', true);
  if (public.marque_points_group_of(v_ticket))->>'who' = 'Alice' then
    raise notice 'OK 7 : la clé d''Alice dit « Alice »';
  else raise notice 'ÉCHEC 7 : %', public.marque_points_group_of(v_ticket); end if;

  -- 8. ne plus fixer : une liste vide, et l'on entre de nouveau sous n'importe quel prénom
  v_out := public.marque_points_set_people(v_admin, '[]'::jsonb);
  v_code := public.marque_points_invite(v_admin, 60, 1)->>'code';
  if v_out->'people' = '[]'::jsonb and (public.marque_points_ask('Mifa', v_code, 'Alicia', ''))->>'status' = 'waiting' then
    raise notice 'OK 8 : une liste vide ne fixe plus rien';
  else raise notice 'ÉCHEC 8 : %', v_out; end if;
end $$;
