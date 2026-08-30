-- Reference only. Live indexes are created with domain migrations.
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions (owner_id, planned_at);
CREATE INDEX IF NOT EXISTS idx_points_user_date ON user_points (user_id, awarded_at);
CREATE INDEX IF NOT EXISTS idx_feed_items_owner ON feed_items (owner_id);
CREATE INDEX IF NOT EXISTS idx_progress_metric_date ON personal_records (user_id, metric, achieved_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log (actor_user_id, created_at);
