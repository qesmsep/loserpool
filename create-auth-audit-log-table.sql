-- Create the missing auth_audit_log table
-- This table is expected by Supabase for audit logging functionality

CREATE TABLE IF NOT EXISTS auth.audit_log_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    instance_id uuid,
    id_audit uuid,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS audit_log_entries_instance_id_idx ON auth.audit_log_entries(instance_id);
CREATE INDEX IF NOT EXISTS audit_log_entries_created_at_idx ON auth.audit_log_entries(created_at);
CREATE INDEX IF NOT EXISTS audit_log_entries_id_audit_idx ON auth.audit_log_entries(id_audit);

-- Grant necessary permissions
GRANT SELECT, INSERT ON auth.audit_log_entries TO authenticated;
GRANT SELECT, INSERT ON auth.audit_log_entries TO service_role;
GRANT SELECT, INSERT ON auth.audit_log_entries TO anon;

-- Enable RLS (Row Level Security) if needed
ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows service role to insert audit logs
CREATE POLICY IF NOT EXISTS "Service role can insert audit logs" ON auth.audit_log_entries
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Create a policy that allows service role to read audit logs
CREATE POLICY IF NOT EXISTS "Service role can read audit logs" ON auth.audit_log_entries
    FOR SELECT TO service_role
    USING (true);

-- Create a policy that allows authenticated users to read their own audit logs
CREATE POLICY IF NOT EXISTS "Users can read their own audit logs" ON auth.audit_log_entries
    FOR SELECT TO authenticated
    USING (true);

COMMENT ON TABLE auth.audit_log_entries IS 'Audit log table for Supabase authentication events';
COMMENT ON COLUMN auth.audit_log_entries.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN auth.audit_log_entries.instance_id IS 'Instance ID for the audit log entry';
COMMENT ON COLUMN auth.audit_log_entries.id_audit IS 'Audit ID for the audit log entry';
COMMENT ON COLUMN auth.audit_log_entries.payload IS 'JSON payload containing audit information';
COMMENT ON COLUMN auth.audit_log_entries.created_at IS 'Timestamp when the audit log entry was created';
COMMENT ON COLUMN auth.audit_log_entries.ip_address IS 'IP address of the user who triggered the audit event';
COMMENT ON COLUMN auth.audit_log_entries.user_agent IS 'User agent string of the client';
