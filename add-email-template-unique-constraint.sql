-- Add unique constraint to email_templates name column
-- This allows using ON CONFLICT (name) in future INSERT statements

-- First, check if there are any duplicate names
SELECT name, COUNT(*) as count
FROM email_templates 
GROUP BY name 
HAVING COUNT(*) > 1;

-- If there are duplicates, you'll need to resolve them first
-- Then run this to add the unique constraint:

-- Add unique constraint to name column
ALTER TABLE email_templates 
ADD CONSTRAINT email_templates_name_unique UNIQUE (name);

-- Verify the constraint was added
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'email_templates' 
AND constraint_type = 'UNIQUE';
