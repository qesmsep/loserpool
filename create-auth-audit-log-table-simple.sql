-- Create the missing auth_audit_log table that Supabase expects
-- This table is required for password updates and other auth operations

CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid NULL,
  email text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT auth_audit_log_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS auth_audit_log_user_id_idx ON public.auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS auth_audit_log_email_idx ON public.auth_audit_log(email);
CREATE INDEX IF NOT EXISTS auth_audit_log_created_at_idx ON public.auth_audit_log(created_at);
CREATE INDEX IF NOT EXISTS auth_audit_log_event_type_idx ON public.auth_audit_log(event_type);

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.auth_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.auth_audit_log TO service_role;
GRANT SELECT, INSERT ON public.auth_audit_log TO anon;

-- Enable RLS (Row Level Security)
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
-- Note: IF NOT EXISTS is not supported for CREATE POLICY, so we'll create them directly
-- If policies already exist, you may need to drop them first or ignore the error

CREATE POLICY "Service role can insert audit logs" ON public.auth_audit_log
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can read audit logs" ON public.auth_audit_log
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Users can read their own audit logs" ON public.auth_audit_log
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE public.auth_audit_log IS 'Audit log table for Supabase authentication events';
COMMENT ON COLUMN public.auth_audit_log.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN public.auth_audit_log.event_type IS 'Type of audit event (e.g., password_update, login, etc.)';
COMMENT ON COLUMN public.auth_audit_log.user_id IS 'ID of the user who triggered the audit event';
COMMENT ON COLUMN public.auth_audit_log.email IS 'Email of the user who triggered the audit event';
COMMENT ON COLUMN public.auth_audit_log.created_at IS 'Timestamp when the audit log entry was created';
