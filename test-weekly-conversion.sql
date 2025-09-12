-- Test script for weekly pick conversion functionality
-- This script tests the new status transition logic

-- First, let's see the current status distribution
SELECT 
  'Current Status Distribution' as test_name,
  status,
  COUNT(*) as count
FROM public.picks 
GROUP BY status 
ORDER BY status;

-- Test the conversion function
SELECT 
  'Testing convert_safe_picks_to_pending function' as test_name,
  convert_safe_picks_to_pending() as converted_count;

-- Check the status distribution after conversion
SELECT 
  'Status Distribution After Conversion' as test_name,
  status,
  COUNT(*) as count
FROM public.picks 
GROUP BY status 
ORDER BY status;

-- Test the admin conversion function
SELECT 
  'Testing admin_convert_safe_to_pending function' as test_name,
  admin_convert_safe_to_pending() as result;

-- Test getting picks ready for conversion
SELECT 
  'Picks Ready for Conversion' as test_name,
  COUNT(*) as count
FROM get_picks_ready_for_conversion();

-- Test week end time calculation (using week 1 as example)
SELECT 
  'Week 1 End Time Calculation' as test_name,
  get_week_end_time(1) as week_1_end_time,
  is_week_ended(1) as week_1_ended;

-- Show some sample picks with their current status
SELECT 
  'Sample Picks with Status' as test_name,
  id,
  pick_name,
  status,
  created_at,
  updated_at
FROM public.picks 
ORDER BY updated_at DESC 
LIMIT 5;

