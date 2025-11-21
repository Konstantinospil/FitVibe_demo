-- ENUMS for FitVibe
CREATE TYPE session_status AS ENUM ('planned', 'in_progress', 'completed', 'canceled');
CREATE TYPE visibility_enum AS ENUM ('public', 'friends', 'private','link');
CREATE TYPE health_status AS ENUM ('ok', 'degraded', 'down');
CREATE TYPE muscle_group AS ENUM ('chest','upper_back','lats','shoulders','biceps','triceps','forearms','core','lower_back','glutes','quadriceps','hamstrings','calves','neck');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'alert');
