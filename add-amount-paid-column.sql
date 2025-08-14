-- Add amount_paid column to purchases table for compatibility
-- This ensures the webhook can access amount_paid field

-- Check if amount_paid column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'purchases' 
        AND column_name = 'amount_paid'
    ) THEN
        ALTER TABLE purchases ADD COLUMN amount_paid INTEGER DEFAULT 0;
        
        -- Update existing records to set amount_paid = amount
        UPDATE purchases SET amount_paid = amount WHERE amount_paid = 0;
        
        RAISE NOTICE 'Added amount_paid column to purchases table';
    ELSE
        RAISE NOTICE 'amount_paid column already exists in purchases table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'purchases' 
AND column_name IN ('amount', 'amount_paid')
ORDER BY column_name;
