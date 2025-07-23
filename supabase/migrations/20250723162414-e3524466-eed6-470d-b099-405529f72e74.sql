-- Create storage bucket for customer documents
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-documents', 'customer-documents', false);

-- Create storage policies for customer documents
CREATE POLICY "Customers can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'customer-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Customers can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'customer-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Customers can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'customer-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Customers can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'customer-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable realtime for chat messages
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE chat_messages;

-- Insert some sample predefined questions
INSERT INTO predefined_questions (question, answer, category, is_active) VALUES
('How do I track my scooter order?', 'You can track your scooter order by visiting the Order Tracking section in your account or by using the tracking number provided in your confirmation email.', 'Orders', true),
('What is the warranty period for my scooter?', 'All MyScoot scooters come with a 12-month warranty covering manufacturing defects and electrical components.', 'Warranty', true),
('How do I charge my electric scooter?', 'Connect the provided charger to your scooter''s charging port and plug it into a standard electrical outlet. Charging typically takes 4-6 hours for a full charge.', 'Usage', true),
('Can I ride my scooter in the rain?', 'MyScoot scooters have IP54 water resistance rating. Light rain is okay, but avoid heavy rain and never submerge the scooter in water.', 'Usage', true),
('How do I register my scooter?', 'You can register your scooter through the MyScoot app or website using your purchase receipt and the serial number found on your scooter.', 'Registration', true),
('What should I do if my scooter won''t start?', 'First, check if the battery is charged. If charged, ensure the kickstand is up and the power button is held for 3 seconds. If issues persist, contact support.', 'Troubleshooting', true),
('How do I return or exchange my scooter?', 'Returns and exchanges are accepted within 30 days of purchase. Contact our support team to initiate the return process.', 'Returns', true),
('What is the maximum weight limit for the scooter?', 'The maximum weight limit varies by model. Most MyScoot scooters support riders up to 100kg (220 lbs). Check your specific model specifications.', 'Specifications', true);