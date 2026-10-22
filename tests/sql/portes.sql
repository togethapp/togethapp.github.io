\pset tuples_only on
do $$
declare
  v_admin text; v_code text; v_ticket text; v_token text; v_back text; v_tom jsonb; v_tom_token text;
  v_person text; v_first text; v_second text; v_answers text := ''; v_out jsonb;
begin
  select cle into v_admin from public.marque_points_new_group('Portes');

  -- Léa entre, se fait un lien de retour, et revient par lui sur un second appareil.
  v_code := public.marque_points_invite(v_admin, 60, 5)->>'code';
  v_ticket := public.marque_points_ask('Portes', v_code, 'Léa', 'téléphone')->>'ticket';
  perform public.marque_points_answer(v_admin, (public.marque_points_requests(v_admin))->0->>'id', true);
  v_token := public.marque_points_my_link(v_ticket)->>'token';
  select person_id into v_person from public.marque_points_group_key where key_hash = md5(v_ticket || key_salt);

  -- 1. des codes tirés au hasard reçoivent tous la même réponse, jamais « occupé »
  for i in 1..30 loop
    if lpad(i::text, 6, '0') <> v_code then
      v_answers := v_answers || ((public.marque_points_ask('Portes', lpad(i::text, 6, '0'), 'X', ''))->>'status') || ' ';
    end if;
  end loop;
  if v_answers !~ 'busy' and v_answers ~ 'unknown' then
    raise notice 'OK 1 : trente codes au hasard, aucun ne dit si un autre existe';
  else raise notice 'ÉCHEC 1 : %', v_answers; end if;

  -- 2. et ne bloquent ni le vrai code, ni les liens de retour de tout le monde
  v_out := public.marque_points_return(v_token, 'tablette');
  v_back := v_out->>'key';
  v_tom := public.marque_points_ask('Portes', v_code, 'Tom', 'ordinateur');
  if v_tom->>'status' = 'waiting' and v_out->>'status' = 'ok' then
    raise notice 'OK 2 : après eux, le vrai code fait frapper, et le lien de retour ramène';
  else raise notice 'ÉCHEC 2 : % %', v_tom, v_out; end if;

  -- 3. couper un appareil de Léa sur deux laisse son lien : elle est encore là
  select id into v_second from public.marque_points_group_key where key_hash = md5(v_back || key_salt);
  select id into v_first from public.marque_points_group_key where key_hash = md5(v_ticket || key_salt);
  perform public.marque_points_cut_key(v_admin, v_second);
  if (select token_hash is not null from public.marque_points_person where id = v_person) then
    raise notice 'OK 3 : un appareil coupé sur deux, le lien de retour reste';
  else raise notice 'ÉCHEC 3'; end if;

  -- 4. couper son dernier appareil coupe aussi son lien : elle ne revient plus seule
  perform public.marque_points_cut_key(v_admin, v_first);
  if (public.marque_points_return(v_token, 'ordinateur'))->>'status' = 'unknown'
     and not exists (select 1 from public.marque_points_group_key where person_id = v_person) then
    raise notice 'OK 4 : le dernier appareil coupé, le lien de retour ne sert plus';
  else raise notice 'ÉCHEC 4'; end if;

  -- 5. un vrai code avec un faux nom compte toujours sur son groupe : au vingtième,
  -- la porte se ferme un moment, même au bon nom
  for i in 1..20 loop perform public.marque_points_ask('Pas le bon', v_code, 'X', ''); end loop;
  if (public.marque_points_ask('Portes', v_code, 'Zoé', ''))->>'status' = 'busy' then
    raise notice 'OK 5 : vingt faux noms sur un vrai code ferment la porte du groupe';
  else raise notice 'ÉCHEC 5'; end if;

  -- 6. le bouton d'alarme met tout le monde dehors, liens de retour compris
  perform public.marque_points_answer(v_admin, (public.marque_points_requests(v_admin))->0->>'id', true);
  v_tom_token := public.marque_points_my_link(v_tom->>'ticket')->>'token';
  perform public.marque_points_new_group_key('Portes');
  if v_tom_token is not null and (public.marque_points_return(v_tom_token, 'tablette'))->>'status' = 'unknown' then
    raise notice 'OK 6 : après le bouton d''alarme, le lien de retour de Tom ne le ramène pas';
  else raise notice 'ÉCHEC 6 : %', v_tom_token; end if;
end;
$$;
