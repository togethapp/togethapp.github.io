\pset tuples_only on
-- Les rappels de la veille. L'heure n'est pas choisie par le contrôle : les
-- fuseaux, si. « Le soir » est un fuseau où il est 19 h en ce moment, « le
-- matin » un fuseau où il est 10 h ; demain se compte dans chacun.
do $$
declare
  v_gui text; v_alice text; v_bob text; v_code text; v_out jsonb; v_one jsonb; v_n integer;
  v_soir text; v_matin text; v_demain text; v_hier text;
  v_p256 text := 'BA3xkPq8MXN8qJ3wk_0BrivFfuUnIdGzFWzitn3FfhXJyS5nAgjhs3xLrV-TvwrlAz6OYo_vwuqCGf6w7SIYtlw';
  v_auth text := 'IxNSocK0BfpuTPJ-9QH84w';
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select name into v_soir from pg_timezone_names
   where name ~ '^Etc/GMT' and extract(hour from now() at time zone name) = 19 limit 1;
  select name into v_matin from pg_timezone_names
   where name ~ '^Etc/GMT' and extract(hour from now() at time zone name) = 10 limit 1;
  v_demain := to_char((now() at time zone v_soir)::date + 1, 'YYYY-MM-DD');
  v_hier := to_char((now() at time zone v_soir)::date - 1, 'YYYY-MM-DD');

  select cle into v_gui from public.marque_points_new_group('Mifa');
  v_code := public.marque_points_invite(v_gui, 60, 1)->>'code';
  v_alice := public.marque_points_ask('Mifa', v_code, 'Alice', 'téléphone')->>'ticket';
  perform public.marque_points_answer(v_gui, (public.marque_points_requests(v_gui))->0->>'id', true);
  v_code := public.marque_points_invite(v_gui, 60, 1)->>'code';
  v_bob := public.marque_points_ask('Mifa', v_code, 'Bob', 'téléphone')->>'ticket';
  perform public.marque_points_answer(v_gui, (public.marque_points_requests(v_gui))->0->>'id', true);

  -- 1. le fuseau se garde ; un fuseau inconnu devient celui de Paris
  perform public.marque_points_push_subscribe(v_gui, 'https://fcm.googleapis.com/fcm/send/gui-0123456789', v_p256, v_auth, 'fr', 'https://x.github.io/', v_soir);
  perform public.marque_points_push_subscribe(v_alice, 'https://web.push.apple.com/alice-0123456789', v_p256, v_auth, 'en', '', v_soir);
  perform public.marque_points_push_subscribe(v_bob, 'https://fcm.googleapis.com/fcm/send/bob-0123456789', v_p256, v_auth, 'fr', '', v_matin);
  perform public.marque_points_push_subscribe(v_gui, 'https://fcm.googleapis.com/fcm/send/zoe-0123456789', v_p256, v_auth, 'fr', '', 'Pas/Un_Fuseau');
  perform public.marque_points_push_subscribe(v_gui, 'https://fcm.googleapis.com/fcm/send/ancien-0123456789', v_p256, v_auth, 'fr', '');
  if (select tz from public.marque_points_push where endpoint like '%gui%') = v_soir
     and (select tz from public.marque_points_push where endpoint like '%zoe%') = 'Europe/Paris'
     and (select tz from public.marque_points_push where endpoint like '%ancien%') = 'Europe/Paris' then
    raise notice 'OK 1 : le fuseau de l''appareil est gardé, un fuseau inconnu ne l''est pas';
  else raise notice 'ÉCHEC 1'; end if;
  delete from public.marque_points_push where endpoint like '%zoe%' or endpoint like '%ancien%';

  -- La raclette, demain, à 20 h, avec sa chaîne : une liste (deux lignes sur
  -- trois à faire), un sondage ouvert, un sondage clos, un modèle, et une
  -- liste « lien seulement » qui ne compte pas.
  perform public.marque_points_put('v_raclette', jsonb_build_object(
    'kind','poll','id','v_raclette','question','Raclette','title','Raclette','fixed',true,
    'date',v_demain,'at','20:00','createdAt',v_now,'updatedAt',v_now,'closedAt',v_now,
    'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  perform public.marque_points_put('l_courses', jsonb_build_object(
    'kind','list','id','l_courses','name','Courses','parent','v_raclette','createdAt',v_now,'updatedAt',v_now,
    'people','[]'::jsonb,'items',jsonb_build_array(
      jsonb_build_object('id','i1','text','Fromage','done',true),
      jsonb_build_object('id','i2','text','Patates','done',false),
      jsonb_build_object('id','i3','text','Vin'))), v_gui);
  perform public.marque_points_put('v_vin_001', jsonb_build_object(
    'kind','poll','id','v_vin_001','question','Quel vin ?','parent','l_courses','createdAt',v_now,'updatedAt',v_now,
    'closedAt',null,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  perform public.marque_points_put('v_dessert', jsonb_build_object(
    'kind','poll','id','v_dessert','question','Quel dessert ?','event','v_raclette','createdAt',v_now,'updatedAt',v_now,
    'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  perform public.marque_points_put('l_modele', jsonb_build_object(
    'kind','list','id','l_modele','name','Modèle','parent','v_raclette','template',true,'createdAt',v_now,'updatedAt',v_now,
    'people','[]'::jsonb,'items',jsonb_build_array(jsonb_build_object('id','i4','text','Sel','done',false))), v_gui);
  perform public.marque_points_put('l_secrete', jsonb_build_object(
    'kind','list','id','l_secrete','name','Cadeau','parent','v_raclette','linkOnly',true,'createdAt',v_now,'updatedAt',v_now,
    'people','[]'::jsonb,'items',jsonb_build_array(jsonb_build_object('id','i5','text','Surprise','done',false))), v_gui);

  -- 2. la veille au soir : un rappel, à ceux du soir seulement, avec ce qui reste
  v_out := public.marque_points_push_reminders();
  v_one := v_out->0;
  if jsonb_array_length(v_out) = 1 and v_one->>'id' = 'v_raclette' and v_one->>'event' = 'eve'
     and v_one->>'group' = 'Mifa' and v_one->>'day' = v_demain and (v_one->>'starts')::boolean
     and v_one->'doc'->>'title' = 'Raclette' and v_one->'doc'->>'at' = '20:00'
     and (v_one->'left'->>'lines')::int = 2 and (v_one->'left'->>'polls')::int = 1
     and jsonb_array_length(v_one->'targets') = 2
     and not (v_one->'targets')::text like '%bob%' then
    raise notice 'OK 2 : la veille au soir, un rappel avec ce qui reste à faire';
  else raise notice 'ÉCHEC 2 : %', v_out; end if;

  -- 3. une fois seulement
  if jsonb_array_length(public.marque_points_push_reminders()) = 0 then
    raise notice 'OK 3 : un rappel ne sonne qu''une fois';
  else raise notice 'ÉCHEC 3'; end if;

  -- 4. une date annoncée il y a moins de douze heures ne se rappelle pas
  perform public.marque_points_put('v_vite_001', jsonb_build_object(
    'kind','poll','id','v_vite_001','question','Ciné','fixed',true,'date',v_demain,'createdAt',v_now,'updatedAt',v_now,
    'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  insert into public.marque_points_push_sent (doc_id, event, sent_at) values ('v_vite_001', 'date:' || v_demain, now() - interval '2 hours');
  perform public.marque_points_put('v_avant_001', jsonb_build_object(
    'kind','poll','id','v_avant_001','question','Piscine','fixed',true,'date',v_demain,'createdAt',v_now,'updatedAt',v_now,
    'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  insert into public.marque_points_push_sent (doc_id, event, sent_at) values ('v_avant_001', 'date:' || v_demain, now() - interval '3 days');
  v_out := public.marque_points_push_reminders();
  if jsonb_array_length(v_out) = 1 and v_out->0->>'id' = 'v_avant_001' then
    raise notice 'OK 4 : une date qu''on vient d''apprendre ne se rappelle pas';
  else raise notice 'ÉCHEC 4 : %', v_out; end if;

  -- 5. un séjour commencé hier : ses activités de demain se rappellent avec
  -- lui, aucune toute seule ; sans activité demain, rien
  perform public.marque_points_put('v_sejour', jsonb_build_object(
    'kind','poll','id','v_sejour','question','Vacances','title','Vacances','fixed',true,'date',v_hier,
    'until',to_char((now() at time zone v_soir)::date + 5, 'YYYY-MM-DD'),'createdAt',v_now,'updatedAt',v_now,
    'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  perform public.marque_points_put('v_long_001', jsonb_build_object(
    'kind','poll','id','v_long_001','question','Stage','fixed',true,'date',v_hier,
    'until',to_char((now() at time zone v_soir)::date + 5, 'YYYY-MM-DD'),'createdAt',v_now,'updatedAt',v_now,
    'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  perform public.marque_points_put('v_kayak_001', jsonb_build_object(
    'kind','poll','id','v_kayak_001','question','Kayak','title','Kayak','fixed',true,'parent','v_sejour','date',v_demain,'at','10:00',
    'createdAt',v_now,'updatedAt',v_now,'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  perform public.marque_points_put('v_resto_001', jsonb_build_object(
    'kind','poll','id','v_resto_001','question','Resto','fixed',true,'parent','v_sejour','date',v_demain,
    'createdAt',v_now,'updatedAt',v_now,'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  v_out := public.marque_points_push_reminders();
  v_one := v_out->0;
  if jsonb_array_length(v_out) = 1 and v_one->>'id' = 'v_sejour' and not (v_one->>'starts')::boolean
     and jsonb_array_length(v_one->'activities') = 2
     and v_one->'activities'->0->>'question' = 'Resto' and v_one->'activities'->1->>'at' = '10:00'
     and (v_one->'left'->>'lines')::int = 0 then
    raise notice 'OK 5 : les activités de demain se rappellent avec leur événement';
  else raise notice 'ÉCHEC 5 : %', v_out; end if;

  -- 6. rangé, ou « lien seulement » : pas de rappel
  perform public.marque_points_put('v_range_001', jsonb_build_object(
    'kind','poll','id','v_range_001','question','Rangé','fixed',true,'date',v_demain,'archivedAt',v_now,
    'createdAt',v_now,'updatedAt',v_now,'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  perform public.marque_points_put('v_lien_001', jsonb_build_object(
    'kind','poll','id','v_lien_001','question','Lien','fixed',true,'date',v_demain,'linkOnly',true,
    'createdAt',v_now,'updatedAt',v_now,'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  if jsonb_array_length(public.marque_points_push_reminders()) = 0 then
    raise notice 'OK 6 : ce qui est rangé ou en lien seulement ne se rappelle pas';
  else raise notice 'ÉCHEC 6'; end if;

  -- 7. le matin, rien ; le soir venu là-bas, ceux du matin ont le leur
  perform public.marque_points_put('v_matin_001', jsonb_build_object(
    'kind','poll','id','v_matin_001','question','Marché','fixed',true,
    'date',to_char((now() at time zone v_matin)::date + 1, 'YYYY-MM-DD'),
    'createdAt',v_now,'updatedAt',v_now,'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  select count(*) into v_n from jsonb_array_elements(public.marque_points_push_reminders()) r
   where (r.value->'targets')::text like '%bob%';
  if v_n = 0 then raise notice 'OK 7 : à 10 h, pas encore de rappel';
  else raise notice 'ÉCHEC 7 : %', v_n; end if;
end;
$$;

-- 8. Un groupe qui exige un compte : un appareil sans compte n'a pas de rappel.
do $$
declare
  v_gui text; v_bob text; v_code text; v_out jsonb; v_soir text; v_user uuid := '44444444-4444-4444-4444-444444444444';
  v_p256 text := 'BA3xkPq8MXN8qJ3wk_0BrivFfuUnIdGzFWzitn3FfhXJyS5nAgjhs3xLrV-TvwrlAz6OYo_vwuqCGf6w7SIYtlw';
  v_auth text := 'IxNSocK0BfpuTPJ-9QH84w';
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select name into v_soir from pg_timezone_names
   where name ~ '^Etc/GMT' and extract(hour from now() at time zone name) = 21 limit 1;
  select cle into v_gui from public.marque_points_new_group('Voisins');
  v_code := public.marque_points_invite(v_gui, 60, 1)->>'code';
  v_bob := public.marque_points_ask('Voisins', v_code, 'Bob', 'téléphone')->>'ticket';
  perform public.marque_points_answer(v_gui, (public.marque_points_requests(v_gui))->0->>'id', true);
  perform public.marque_points_push_subscribe(v_bob, 'https://fcm.googleapis.com/fcm/send/voisin-bob-0123456789', v_p256, v_auth, 'fr', '', v_soir);
  perform public.marque_points_push_subscribe(v_gui, 'https://fcm.googleapis.com/fcm/send/voisin-gui-0123456789', v_p256, v_auth, 'fr', '', v_soir);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform public.marque_points_account_link(v_gui, 'Gui');
  perform public.marque_points_set_accounts(v_gui, true);
  perform public.marque_points_put('v_fete_001', jsonb_build_object(
    'kind','poll','id','v_fete_001','question','Fête','fixed',true,
    'date',to_char((now() at time zone v_soir)::date + 1, 'YYYY-MM-DD'),
    'createdAt',v_now,'updatedAt',v_now,'closedAt',v_now,'people','[]'::jsonb,'options','[]'::jsonb,'votes','{}'::jsonb), v_gui);
  select r.value into v_out from jsonb_array_elements(public.marque_points_push_reminders()) r where r.value->>'id' = 'v_fete_001';
  if jsonb_array_length(v_out->'targets') = 1 and v_out->'targets'->0->>'endpoint' like '%voisin-gui%' then
    raise notice 'OK 8 : dans un groupe qui exige un compte, un appareil sans compte n''a pas de rappel';
  else raise notice 'ÉCHEC 8 : %', v_out; end if;
end;
$$;

-- 9. la clé publique de la page n'appelle pas les rappels
do $$
begin
  if not has_function_privilege('anon', 'public.marque_points_push_reminders()', 'execute')
     and not has_function_privilege('authenticated', 'public.marque_points_push_reminders()', 'execute')
     and has_function_privilege('service_role', 'public.marque_points_push_reminders()', 'execute') then
    raise notice 'OK 9 : seule la fonction demande les rappels';
  else raise notice 'ÉCHEC 9'; end if;
end;
$$;
