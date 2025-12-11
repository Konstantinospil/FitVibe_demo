-- Indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions (owner_id, planned_at);
CREATE INDEX IF NOT EXISTS idx_points_user_date ON user_points (user_id, awarded_at);
CREATE INDEX IF NOT EXISTS idx_feed_items_owner ON feed_items (owner_id);  -- Changed from feed_posts
CREATE INDEX IF NOT EXISTS idx_progress_metric_date ON personal_records (user_id, pr_type, achieved_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log (actor_id, created_at);
-- Removed translations index if that table doesn't exist
