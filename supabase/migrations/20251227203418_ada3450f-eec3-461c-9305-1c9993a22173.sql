-- Create a table to store travel/excluded days per household
CREATE TABLE public.travel_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(household_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.travel_days ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view travel days in their household" 
ON public.travel_days 
FOR SELECT 
USING (public.user_has_household_access(auth.uid(), household_id));

CREATE POLICY "Users can create travel days in their household" 
ON public.travel_days 
FOR INSERT 
WITH CHECK (public.user_has_household_access(auth.uid(), household_id));

CREATE POLICY "Users can delete travel days in their household" 
ON public.travel_days 
FOR DELETE 
USING (public.user_has_household_access(auth.uid(), household_id));

-- Add index for efficient lookups
CREATE INDEX idx_travel_days_household_date ON public.travel_days(household_id, date);