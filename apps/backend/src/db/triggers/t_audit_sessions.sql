-- Audit trigger for sessions table
-- Automatically logs INSERT, UPDATE, and DELETE operations on sessions to the audit_log table

CREATE OR REPLACE FUNCTION public.audit_sessions_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action TEXT;
  v_entity_id UUID;
  v_actor_user_id UUID;
BEGIN
  -- Determine the action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'session.create';
    v_entity_id := NEW.id;
    v_actor_user_id := NEW.owner_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'session.update';
    v_entity_id := NEW.id;
    v_actor_user_id := NEW.owner_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'session.delete';
    v_entity_id := OLD.id;
    v_actor_user_id := OLD.owner_id;
  ELSE
    RETURN NULL;
  END IF;

  -- Insert audit log entry
  INSERT INTO audit_log (
    id,
    actor_user_id,
    entity_type,
    action,
    entity_id,
    outcome,
    metadata,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_actor_user_id,
    'session',
    v_action,
    v_entity_id,
    'success',
    CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'status_changed', CASE WHEN OLD.status <> NEW.status THEN true ELSE false END,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
      ELSE '{}'::jsonb
    END,
    NOW()
  );

  -- Return appropriate row
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_audit_sessions ON sessions;

-- Create trigger for INSERT, UPDATE, and DELETE operations
CREATE TRIGGER trg_audit_sessions
AFTER INSERT OR UPDATE OR DELETE ON sessions
FOR EACH ROW
EXECUTE FUNCTION public.audit_sessions_trigger();
