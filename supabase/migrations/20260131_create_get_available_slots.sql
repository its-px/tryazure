-- =============================================================================
-- FUNCTION: get_available_slots
-- Description: Get available time slots for a professional on a specific date
-- Usage: This function checks professional working hours and existing bookings
--        to return available time slots for booking
-- =============================================================================

-- First, drop the function if it exists
DROP FUNCTION IF EXISTS get_available_slots(TEXT, DATE, INTEGER);

-- Create the function
CREATE OR REPLACE FUNCTION get_available_slots(
  p_professional_id TEXT,
  p_date DATE,
  p_service_duration_minutes INTEGER
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME
) AS $$
DECLARE
  v_day_of_week INTEGER;
  v_work_start TIME;
  v_work_end TIME;
  v_current_time TIME;
  v_slot_duration INTERVAL;
  v_slot_end_time TIME;
BEGIN
  -- Get day of week (0 = Sunday, 1 = Monday, etc.)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Log for debugging
  RAISE NOTICE 'Checking slots for professional: %, date: %, day_of_week: %', 
    p_professional_id, p_date, v_day_of_week;
  
  -- Get professional's working hours for this day
  SELECT ph.start_time, ph.end_time
  INTO v_work_start, v_work_end
  FROM professional_hours ph
  WHERE ph.professional_id = p_professional_id
    AND ph.day_of_week = v_day_of_week;
  
  -- If no working hours found for this day, return empty
  IF v_work_start IS NULL THEN
    RAISE NOTICE 'No working hours found for professional % on day %', 
      p_professional_id, v_day_of_week;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Working hours: % to %', v_work_start, v_work_end;
  
  -- Convert minutes to interval
  v_slot_duration := (p_service_duration_minutes || ' minutes')::INTERVAL;
  
  -- Generate time slots
  v_current_time := v_work_start;
  
  WHILE v_current_time + v_slot_duration <= v_work_end LOOP
    v_slot_end_time := v_current_time + v_slot_duration;
    
    -- Check if this specific time slot overlaps with any existing booking
    -- A slot is available if there's NO overlap with confirmed/pending bookings
    IF NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.professional_id = p_professional_id
        AND b.date = p_date
        AND b.status IN ('confirmed', 'pending')
        -- Check for time overlap: booking overlaps if its start is before slot end
        -- AND its end is after slot start
        AND b.start_time < v_slot_end_time
        AND b.end_time > v_current_time
    ) THEN
      start_time := v_current_time;
      end_time := v_slot_end_time;
      RETURN NEXT;
    END IF;
    
    -- Move to next slot (30-minute increments)
    v_current_time := v_current_time + INTERVAL '30 minutes';
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users and anonymous users
GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER) TO anon;

-- Add a comment to the function
COMMENT ON FUNCTION get_available_slots IS 'Returns available time slots for a professional on a specific date based on working hours and existing bookings';
