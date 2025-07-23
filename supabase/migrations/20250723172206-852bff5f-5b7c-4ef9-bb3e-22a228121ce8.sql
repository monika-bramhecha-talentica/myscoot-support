-- Fix infinite recursion in admin_users RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Only admins can view admin users" ON admin_users;

-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = user_uuid 
    AND is_active = true
  );
$$;

-- Create a new policy using the function to avoid recursion
CREATE POLICY "Admins can view admin users" 
ON admin_users 
FOR SELECT 
USING (public.is_admin_user(auth.uid()));

-- Allow users to view their own admin record if they exist
CREATE POLICY "Users can view their own admin record" 
ON admin_users 
FOR SELECT 
USING (auth.uid() = user_id);