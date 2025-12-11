-- Aggregated user performance view
CREATE OR REPLACE VIEW vw_user_performance AS
SELECT
  u.id AS user_id,
  u.username,
  COUNT(DISTINCT s.id) AS total_sessions,
  SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
  SUM(p.value) FILTER (WHERE p.metric = '1RM') AS total_strength_points
FROM users u
LEFT JOIN sessions s ON s.user_id = u.id
LEFT JOIN progress p ON p.user_id = u.id
GROUP BY u.id;

-- Feed summary view (UPDATED to use feed_items instead of feed_posts)
CREATE OR REPLACE VIEW vw_feed_summary AS
SELECT
  fi.id AS feed_item_id,
  fi.owner_id,
  COUNT(DISTINCT fc.id) AS comments,
  COUNT(DISTINCT fl.user_id) AS likes
FROM feed_items fi
LEFT JOIN feed_comments fc ON fc.feed_item_id = fi.id
LEFT JOIN feed_likes fl ON fl.feed_item_id = fi.id
GROUP BY fi.id, fi.owner_id;
