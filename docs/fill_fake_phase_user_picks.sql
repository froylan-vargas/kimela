BEGIN;

WITH target_sessions AS (
    SELECT s.id
    FROM sessions s
    WHERE s.phase_id = '12803ea6-6408-48a8-96de-d4a7b2589a19'
),
     target_users AS (
         SELECT sub.user_id, sub.qimela_id
         FROM subscriptions sub
         WHERE sub.qimela_id = '2f4ce99a-299c-4701-b50d-873c10c43e4c'
     ),
     target_categories AS (
         SELECT
             ts.id AS session_id,
             pc.id AS pick_category_id,
             pc.name,
             pc.value_type
         FROM target_sessions ts
                  JOIN session_pick_categories spc ON spc.session_id = ts.id
                  JOIN pick_categories pc ON pc.id = spc.pick_category_id
     ),
     fake_picks AS (
         SELECT
             tu.user_id,
             tu.qimela_id,
             tc.session_id,
             tc.pick_category_id,
             CASE
                 WHEN tc.value_type = 'SCALAR' AND tc.name IN ('extra_time', 'penalty_shootout') THEN
                     CASE WHEN random() < 0.18 THEN 'Y' ELSE 'N' END
                 WHEN tc.value_type = 'SCALAR' THEN
                     floor(random() * 5)::int::text
                 ELSE NULL
                 END AS value,
             CASE
                 WHEN tc.value_type = 'CONTENDER' THEN contender_pick.contender_id
                 ELSE NULL
                 END AS picked_contender_id
         FROM target_users tu
                  CROSS JOIN target_categories tc
                  LEFT JOIN LATERAL (
             SELECT sc.contender_id
             FROM session_contenders sc
             WHERE sc.session_id = tc.session_id
             ORDER BY random()
             LIMIT 1
             ) contender_pick ON tc.value_type = 'CONTENDER'
     )
INSERT INTO user_picks (
    id,
    value,
    created_at,
    updated_at,
    user_id,
    session_id,
    pick_category_id,
    qimela_id,
    picked_contender_id
)
SELECT
    concat(
            substr(seed.hash, 1, 8), '-',
            substr(seed.hash, 9, 4), '-',
            substr(seed.hash, 13, 4), '-',
            substr(seed.hash, 17, 4), '-',
            substr(seed.hash, 21, 12)
    ) AS id,
    fp.value,
    now(),
    now(),
    fp.user_id,
    fp.session_id,
    fp.pick_category_id,
    fp.qimela_id,
    fp.picked_contender_id
FROM fake_picks fp
         CROSS JOIN LATERAL (
    SELECT md5(fp.user_id || fp.session_id || fp.pick_category_id || fp.qimela_id) AS hash
    ) seed
WHERE fp.value IS NOT NULL OR fp.picked_contender_id IS NOT NULL
ON CONFLICT (user_id, session_id, pick_category_id, qimela_id)
    DO UPDATE SET
                  value = EXCLUDED.value,
                  picked_contender_id = EXCLUDED.picked_contender_id,
                  updated_at = now();

COMMIT;
