-- Add categorization and response improvement features

-- Add categories to predefined_questions if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='predefined_questions' AND column_name='tags') THEN
        ALTER TABLE predefined_questions ADD COLUMN tags TEXT[];
    END IF;
END $$;

-- Add response quality tracking to escalated_queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escalated_queries' AND column_name='original_response') THEN
        ALTER TABLE escalated_queries ADD COLUMN original_response TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escalated_queries' AND column_name='improved_response') THEN
        ALTER TABLE escalated_queries ADD COLUMN improved_response TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escalated_queries' AND column_name='category') THEN
        ALTER TABLE escalated_queries ADD COLUMN category TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escalated_queries' AND column_name='satisfaction_rating') THEN
        ALTER TABLE escalated_queries ADD COLUMN satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5);
    END IF;
END $$;

-- Create unsatisfied_queries table for tracking user dissatisfaction
CREATE TABLE IF NOT EXISTS unsatisfied_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  session_id UUID NOT NULL,
  message_id UUID,
  query_text TEXT NOT NULL,
  ai_response TEXT,
  category TEXT,
  feedback TEXT,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_escalated BOOLEAN DEFAULT false,
  escalation_id UUID
);

-- Enable RLS on unsatisfied_queries
ALTER TABLE unsatisfied_queries ENABLE ROW LEVEL SECURITY;

-- RLS policies for unsatisfied_queries
CREATE POLICY "Users can create their own unsatisfied queries" 
ON unsatisfied_queries 
FOR INSERT 
WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own unsatisfied queries" 
ON unsatisfied_queries 
FOR SELECT 
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Create query_categories table for categorization
CREATE TABLE IF NOT EXISTS query_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Enable RLS on query_categories
ALTER TABLE query_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories" 
ON query_categories 
FOR SELECT 
USING (is_active = true);

-- Insert default categories
INSERT INTO query_categories (name, description, color) VALUES 
('Technical Support', 'Technical issues and troubleshooting', '#EF4444'),
('Order Inquiry', 'Questions about orders and delivery', '#3B82F6'),
('Product Information', 'Questions about products and features', '#10B981'),
('Billing', 'Billing and payment related queries', '#F59E0B'),
('General', 'General questions and inquiries', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_unsatisfied_queries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_unsatisfied_queries_updated_at
    BEFORE UPDATE ON unsatisfied_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_unsatisfied_queries_updated_at();