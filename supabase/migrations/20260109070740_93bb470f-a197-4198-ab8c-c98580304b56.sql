-- Add policy to allow authenticated users to view all profiles (for friend discovery)
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Keep the existing policy for update/insert/delete (users can only modify their own data)
-- The existing "Users can manage their own data" policy handles that