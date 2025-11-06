-- Clear cached schedule predictions to force regeneration with updated logic
DELETE FROM daily_schedule_predictions 
WHERE prediction_date >= CURRENT_DATE - INTERVAL '30 days';