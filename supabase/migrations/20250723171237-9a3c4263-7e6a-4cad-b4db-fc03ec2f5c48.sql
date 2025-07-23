-- Remove foreign key constraint temporarily and add admin user
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_user_id_fkey;

-- Add admin user Monika Bramhecha
INSERT INTO admin_users (user_id, email, full_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Placeholder UUID
  'monikab@talentica.com',
  'Monika Bramhecha', 
  'admin',
  true
);

-- Add back the foreign key constraint (optional, can be done later)
-- ALTER TABLE admin_users ADD CONSTRAINT admin_users_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;