\pset tuples_only on
do $$
declare
  v_gui text; v_alice text; v_out jsonb; v_code text; v_ticket text; v_n integer; i integer;
  v_p256 text := 'BA3xkPq8MXN8qJ3wk_0BrivFfuUnIdGzFWzitn3FfhXJyS5nAgjhs3xLrV-TvwrlAz6OYo_vwuqCGf6w7SIYtlw';
  v_auth text := 'IxNSocK0BfpuTPJ-9QH84w';
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select cle into v_gui from public.marque_points_new_group('Mifa');
  -- Alice entre : une demande, acceptée, une clé à elle.
  v_code := public.marque_points_invite(v_gui, 60, 1)->>'code';
  v_ticket := public.marque_points_ask('Mifa', v_code, 'Alice', 'téléphone')->>'ticket';
  perform public.marque_points_answer(v_gui, (public.marque_points_requests(v_gui))->0->>'id', true);
  v_alice := v_ticket;

  -- 1. s'abonner demande une clé, et une adresse qui en est une
  v_out := public.marque_points_push_subscribe('pas-une-cle', 'https://fcm.googleapis.com/fcm/send/abc-0123456789', v_p256, v_auth, 'fr', 'https://x.github.io/Code/');
  if v_out->>'status' = 'unknown' then raise notice 'OK 1 : sans clé, pas d''abonnement';
  else raise notice 'ÉCHEC 1 : %', v_out; end if;
  begin
    perform public.marque_points_push_subscribe(v_gui, 'javascript:alert(1)', v_p256, v_auth, 'fr', '');
    raise notice 'ÉCHEC 2 : une fausse adresse est gardée';
  exception when others then
    raise notice 'OK 2 : une fausse adresse est refusée';
  end;

  begin
    perform public.marque_points_push_subscribe(v_gui, 'https://attaquant.example/push/0123456789', v_p256, v_auth, 'fr', '');
    raise notice 'ÉCHEC 2b : une adresse hors des services d''envoi est gardée';
  exception when others then
    raise notice 'OK 2b : seules les adresses des services d''envoi sont gardées';
  end;

  -- 3. Gui et Alice s'abonnent ; deux fois de suite ne fait qu'un abonnement
  perform public.marque_points_push_subscribe(v_gui, 'https://fcm.googleapis.com/fcm/send/gui-0123456789', v_p256, v_auth, 'fr', 'https://x.github.io/Code/');
  perform public.marque_points_push_subscribe(v_gui, 'https://fcm.googleapis.com/fcm/send/gui-0123456789', v_p256, v_auth, 'fr', 'https://x.github.io/Code/');
  v_out := public.marque_points_push_subscribe(v_alice, 'https://web.push.apple.com/alice-0123456789', v_p256, v_auth, 'en', 'javascript:x');
  select count(*) into v_n from public.marque_points_push;
  if v_out->>'status' = 'ok' and v_n = 2 and (select app from public.marque_points_push where endpoint like '%alice%') = '' then
    raise notice 'OK 3 : un abonnement par appareil, et une adresse d''app douteuse n''est pas gardée';
  else raise notice 'ÉCHEC 3 : % %', v_out, v_n; end if;

  -- 4. Gui crée un sondage : Alice est prévenue, pas Gui
  perform public.marque_points_put('v_soir_1', jsonb_build_object(
    'kind','poll','id','v_soir_1','question','Quel soir ?','createdAt',v_now,'updatedAt',v_now,
    'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  v_out := public.marque_points_push_event(v_gui, 'v_soir_1');
  if v_out->>'status' = 'ok' and v_out->>'event' = 'new' and v_out->>'group' = 'Mifa'
     and v_out->'doc'->>'question' = 'Quel soir ?'
     and jsonb_array_length(v_out->'targets') = 1 and v_out->'targets'->0->>'endpoint' like '%alice%'
     and v_out->'targets'->0->>'lang' = 'en' then
    raise notice 'OK 4 : un nouveau sondage prévient les autres, pas qui l''a écrit';
  else raise notice 'ÉCHEC 4 : %', v_out; end if;

  -- 5. une seule fois, même demandé par un autre appareil
  v_out := public.marque_points_push_event(v_alice, 'v_soir_1');
  if v_out->>'status' = 'quiet' then raise notice 'OK 5 : une nouveauté ne sonne qu''une fois';
  else raise notice 'ÉCHEC 5 : %', v_out; end if;

  -- 6. la date retenue sonne, une fois par date
  perform public.marque_points_put('v_soir_1', jsonb_build_object(
    'kind','poll','id','v_soir_1','question','Quel soir ?','createdAt',v_now,'updatedAt',v_now + 1,
    'date', to_char(now() + interval '3 days', 'YYYY-MM-DD'),
    'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  v_out := public.marque_points_push_event(v_gui, 'v_soir_1');
  if v_out->>'event' = 'date' and v_out->'doc'->>'date' = to_char(now() + interval '3 days', 'YYYY-MM-DD') then
    raise notice 'OK 6 : la date retenue prévient';
  else raise notice 'ÉCHEC 6 : %', v_out; end if;
  v_out := public.marque_points_push_event(v_gui, 'v_soir_1');
  if v_out->>'status' = 'quiet' then raise notice 'OK 7 : la même date ne sonne pas deux fois';
  else raise notice 'ÉCHEC 7 : %', v_out; end if;

  -- 8. un document d'avant (créé il y a longtemps), vu pour la première fois : rien
  perform public.marque_points_put('l_vieille_1', jsonb_build_object(
    'kind','list','id','l_vieille_1','name','Vieille liste','createdAt',v_now - 30 * 86400000::bigint,
    'updatedAt',v_now,'people','[]'::jsonb,'items','[]'::jsonb), v_gui);
  v_out := public.marque_points_push_event(v_gui, 'l_vieille_1');
  if v_out->>'status' = 'quiet' then raise notice 'OK 8 : un vieux document ne sonne pas';
  else raise notice 'ÉCHEC 8 : %', v_out; end if;

  -- 9. un « lien seulement » ne sonne pas
  perform public.marque_points_put('v_lien_1', jsonb_build_object(
    'kind','poll','id','v_lien_1','question','Secret ?','linkOnly',true,'createdAt',v_now,'updatedAt',v_now,
    'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  v_out := public.marque_points_push_event(v_gui, 'v_lien_1');
  if v_out->>'status' = 'unknown' then raise notice 'OK 9 : un « lien seulement » ne prévient pas le groupe';
  else raise notice 'ÉCHEC 9 : %', v_out; end if;

  -- 10. quelqu'un frappe : seuls ceux qui font entrer, une fois
  v_code := public.marque_points_invite(v_gui, 60, 1)->>'code';
  v_ticket := public.marque_points_ask('Mifa', v_code, 'Zoé', 'ordinateur')->>'ticket';
  v_out := public.marque_points_push_knock(v_ticket);
  if v_out->>'who' = 'Zoé' and jsonb_array_length(v_out->'targets') = 1
     and v_out->'targets'->0->>'endpoint' like '%gui%' then
    raise notice 'OK 10 : qui frappe est annoncé à qui fait entrer, et à lui seul';
  else raise notice 'ÉCHEC 10 : %', v_out; end if;
  if (public.marque_points_push_knock(v_ticket))->>'status' = 'quiet'
     and (public.marque_points_push_knock('faux-ticket'))->>'status' = 'unknown' then
    raise notice 'OK 11 : une fois, et pas sans ticket';
  else raise notice 'ÉCHEC 11'; end if;

  -- 12. une adresse disparue s'oublie ; se désabonner aussi
  perform public.marque_points_push_gone('https://web.push.apple.com/alice-0123456789');
  perform public.marque_points_push_unsubscribe('https://fcm.googleapis.com/fcm/send/gui-0123456789');
  select count(*) into v_n from public.marque_points_push;
  if v_n = 0 then raise notice 'OK 12 : désabonné, oublié';
  else raise notice 'ÉCHEC 12 : %', v_n; end if;

  -- 13. couper une clé efface ses abonnements
  perform public.marque_points_push_subscribe(v_alice, 'https://web.push.apple.com/alice-0123456789', v_p256, v_auth, 'fr', '');
  delete from public.marque_points_group_key where key_hash = md5(v_alice || key_salt);
  select count(*) into v_n from public.marque_points_push;
  if v_n = 0 then raise notice 'OK 13 : une clé coupée n''est plus prévenue';
  else raise notice 'ÉCHEC 13 : %', v_n; end if;

  -- 13b. cinq abonnements au plus par clé : les plus anciens s'en vont
  for i in 1..7 loop
    perform public.marque_points_push_subscribe(v_gui, 'https://updates.push.services.mozilla.com/wpush/v2/n' || i,
      v_p256, v_auth, 'fr', '');
  end loop;
  select count(*) into v_n from public.marque_points_push p
    join public.marque_points_group_key k on k.id = p.key_id where k.key_hash = md5(v_gui || k.key_salt);
  if v_n = 5 and not exists (select 1 from public.marque_points_push where endpoint like '%/n1')
     and exists (select 1 from public.marque_points_push where endpoint like '%/n7') then
    raise notice 'OK 13b : cinq abonnements au plus par clé, les plus récents';
  else raise notice 'ÉCHEC 13b : %', v_n; end if;

  -- 14. la paire de clés : faite une fois, jamais remplacée
  perform public.marque_points_push_vapid('premiere', '{"d":"1"}'::jsonb);
  perform public.marque_points_push_vapid('seconde', '{"d":"2"}'::jsonb);
  if (public.marque_points_push_vapid())->>'public' = 'premiere' then raise notice 'OK 14 : une seule paire de clés';
  else raise notice 'ÉCHEC 14'; end if;
end;
$$;

-- 16. Un groupe qui exige un compte : un appareil sans compte n'est pas prévenu.
do $$
declare
  v_gui text; v_bob text; v_code text; v_out jsonb; v_user uuid := '33333333-3333-3333-3333-333333333333';
  v_p256 text := 'BA3xkPq8MXN8qJ3wk_0BrivFfuUnIdGzFWzitn3FfhXJyS5nAgjhs3xLrV-TvwrlAz6OYo_vwuqCGf6w7SIYtlw';
  v_auth text := 'IxNSocK0BfpuTPJ-9QH84w';
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select cle into v_gui from public.marque_points_new_group('Voisins');
  v_code := public.marque_points_invite(v_gui, 60, 1)->>'code';
  v_bob := public.marque_points_ask('Voisins', v_code, 'Bob', 'téléphone')->>'ticket';
  perform public.marque_points_answer(v_gui, (public.marque_points_requests(v_gui))->0->>'id', true);
  perform public.marque_points_push_subscribe(v_bob, 'https://fcm.googleapis.com/fcm/send/bob-0123456789', v_p256, v_auth, 'fr', '');
  -- Gui se connecte, marque sa clé, et exige un compte ; Bob n'en a pas.
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform public.marque_points_account_link(v_gui, 'Gui');
  perform public.marque_points_set_accounts(v_gui, true);
  perform public.marque_points_put('l_voisins_1', jsonb_build_object(
    'kind','list','id','l_voisins_1','name','Fête','createdAt',v_now,'updatedAt',v_now,
    'people','[]'::jsonb,'items','[]'::jsonb), v_gui);
  v_out := public.marque_points_push_event(v_gui, 'l_voisins_1');
  if v_out->>'status' = 'ok' and jsonb_array_length(v_out->'targets') = 0 then
    raise notice 'OK 16 : dans un groupe qui exige un compte, un appareil sans compte n''est pas prévenu';
  else raise notice 'ÉCHEC 16 : %', v_out; end if;
end;
$$;

-- 15. la clé publique de la page ne lit rien de tout ça
do $$
begin
  if has_function_privilege('anon', 'public.marque_points_push_subscribe(text, text, text, text, text, text, text)', 'execute')
     and not has_function_privilege('anon', 'public.marque_points_push_vapid(text, jsonb)', 'execute')
     and not has_function_privilege('anon', 'public.marque_points_push_event(text, text)', 'execute')
     and not has_function_privilege('anon', 'public.marque_points_push_knock(text)', 'execute')
     and not has_function_privilege('anon', 'public.marque_points_push_gone(text)', 'execute')
     and has_function_privilege('service_role', 'public.marque_points_push_event(text, text)', 'execute') then
    raise notice 'OK 15 : la page s''abonne, seule la fonction lit les abonnés et les clés';
  else raise notice 'ÉCHEC 15'; end if;
end;
$$;
