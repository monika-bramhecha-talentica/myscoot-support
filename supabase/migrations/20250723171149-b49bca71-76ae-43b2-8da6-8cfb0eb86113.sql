-- Add admin user Monika Bramhecha
INSERT INTO admin_users (user_id, email, full_name, role, is_active)
VALUES (
  gen_random_uuid(), -- Temporary UUID, will be updated when user signs up
  'monikab@talentica.com',
  'Monika Bramhecha', 
  'admin',
  true
);