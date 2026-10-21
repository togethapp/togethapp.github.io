\pset tuples_only on
-- Les réactions et les mots d'un sondage, d'un événement : chacun les siens,
-- fondus case par case comme les votes, même sur ce qui est clos.
do $$
declare
  v_key text; v_secret text := 'secret-de-gui-0123456789abcdef'; v_doc jsonb;
  v_id text := 'v_raclette_mots_1'; v_ev text := 'v_soiree_mots_1';
begin
  select cle into v_key from public.marque_points_new_group('Mifa');
  perform public.marque_points_put(v_id, jsonb_build_object(
    'kind','poll','id',v_id,'question','Quel soir ?','closedAt',null,
    'options', '[{"id":"o1","text":"vendredi"},{"id":"o2","text":"samedi"}]'::jsonb,
    'people', '[{"id":"w1","name":"Gui"}]'::jsonb, 'votes', '{}'::jsonb,
    'reacts', '{"o1|gui":{"e":"👍","n":"Gui","at":1}}'::jsonb, 'peopleAt', 1, 'updatedAt', 1), v_key, v_secret);

  -- 1. un visiteur réagit à un choix et laisse un mot : tout est pris
  perform public.marque_points_put(v_id, jsonb_build_object(
    'kind','poll','id',v_id,'question','Quel soir ?','closedAt',null,
    'options', '[{"id":"o1","text":"vendredi"},{"id":"o2","text":"samedi"}]'::jsonb,
    'people', '[{"id":"w1","name":"Gui"}]'::jsonb, 'votes', '{}'::jsonb,
    'reacts', '{"o2|alice":{"e":"❤️","n":"Alice","at":2}}'::jsonb,
    'comments', '{"m_1":{"on":"o2","n":"Alice","t":"Samedi, plutôt !","made":2,"at":2}}'::jsonb,
    'peopleAt', 1, 'updatedAt', 2), null, null);
  v_doc := public.marque_points_get(v_id);
  if (v_doc->'reacts') ? 'o1|gui' and v_doc->'reacts'->'o2|alice'->>'e' = '❤️'
     and v_doc->'comments'->'m_1'->>'t' = 'Samedi, plutôt !' then
    raise notice 'OK 1 : la réaction et le mot d''un visiteur s''ajoutent à ceux qui y sont';
  else raise notice 'ÉCHEC 1 : %', v_doc; end if;

  -- 2. l'organisateur écrit d'une copie qui ne les a pas : ils restent
  perform public.marque_points_put(v_id, jsonb_build_object(
    'kind','poll','id',v_id,'question','Quel soir, finalement ?','closedAt',null,
    'options', '[{"id":"o1","text":"vendredi"},{"id":"o2","text":"samedi"}]'::jsonb,
    'people', '[{"id":"w1","name":"Gui"}]'::jsonb, 'votes', '{}'::jsonb,
    'reacts', '{"o1|gui":{"e":"","n":"Gui","at":3}}'::jsonb, 'peopleAt', 1, 'updatedAt', 3), v_key, v_secret);
  v_doc := public.marque_points_get(v_id);
  if v_doc->>'question' = 'Quel soir, finalement ?' and v_doc->'reacts'->'o1|gui'->>'e' = ''
     and v_doc->'reacts'->'o2|alice'->>'e' = '❤️' and (v_doc->'comments') ? 'm_1' then
    raise notice 'OK 2 : une copie en retard n''efface ni réaction ni mot, et une réaction se reprend';
  else raise notice 'ÉCHEC 2 : %', v_doc; end if;

  -- 3. une réaction plus ancienne ne passe pas devant
  perform public.marque_points_put(v_id, v_doc || jsonb_build_object(
    'reacts', '{"o2|alice":{"e":"🎉","n":"Alice","at":1}}'::jsonb), null, null);
  if (public.marque_points_get(v_id))->'reacts'->'o2|alice'->>'e' = '❤️' then
    raise notice 'OK 3 : la réaction la plus récente l''emporte';
  else raise notice 'ÉCHEC 3'; end if;

  -- 4. un événement (clos d'office) : pas de vote, mais des réactions et des mots
  perform public.marque_points_put(v_ev, jsonb_build_object(
    'kind','poll','id',v_ev,'question','Raclette','fixed',true,'date','2030-01-01','closedAt',1,
    'options','[]'::jsonb,'people','[{"id":"w1","name":"Gui"}]'::jsonb,'votes','{}'::jsonb,'peopleAt',1,'updatedAt',1),
    v_key, v_secret);
  perform public.marque_points_put(v_ev, jsonb_build_object(
    'kind','poll','id',v_ev,'question','PIRATÉ','fixed',true,'date','2031-01-01','closedAt',1,
    'options','[]'::jsonb,'people','[]'::jsonb,'votes','{"w1|o1":{"v":"yes","at":5}}'::jsonb,
    'reacts','{"|bob":{"e":"🎉","n":"Bob","at":5}}'::jsonb,
    'comments','{"m_2":{"on":"","n":"Bob","t":"J''apporte le fromage","made":5,"at":5}}'::jsonb,
    'peopleAt',1,'updatedAt',5), null, null);
  v_doc := public.marque_points_get(v_ev);
  if v_doc->>'question' = 'Raclette' and v_doc->>'date' = '2030-01-01' and v_doc->'votes' = '{}'::jsonb
     and v_doc->'reacts'->'|bob'->>'e' = '🎉' and v_doc->'comments'->'m_2'->>'n' = 'Bob'
     and (v_doc->>'updatedAt')::numeric = 5 then
    raise notice 'OK 4 : sur un événement clos, réactions et mots passent, le reste non';
  else raise notice 'ÉCHEC 4 : %', v_doc; end if;

  -- 5. ce qui n'est pas un ensemble de cases ne casse rien
  perform public.marque_points_put(v_ev, v_doc || jsonb_build_object('reacts', '"pas des cases"'::jsonb,
    'comments', '[1,2]'::jsonb), null, null);
  v_doc := public.marque_points_get(v_ev);
  if v_doc->'reacts'->'|bob'->>'e' = '🎉' and (v_doc->'comments') ? 'm_2' then
    raise notice 'OK 5 : des réactions mal formées ne remplacent rien';
  else raise notice 'ÉCHEC 5 : %', v_doc; end if;
end;
$$;
