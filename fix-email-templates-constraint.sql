-- Fix email_templates trigger_type check constraint
-- This adds 'signup_confirmation' to the allowed trigger types

-- First, drop the existing check constraint
ALTER TABLE email_templates 
DROP CONSTRAINT IF EXISTS email_templates_trigger_type_check;

-- Add the updated check constraint with signup_confirmation included
ALTER TABLE email_templates 
ADD CONSTRAINT email_templates_trigger_type_check 
CHECK (trigger_type IN ('pick_reminder', 'welcome', 'elimination', 'signup_confirmation', 'custom'));

-- Verify the constraint was updated
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'email_templates_trigger_type_check';
