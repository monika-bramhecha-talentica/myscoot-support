-- Create enum types
CREATE TYPE public.message_type AS ENUM ('user', 'bot');
CREATE TYPE public.escalation_status AS ENUM ('pending', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.admin_role AS ENUM ('admin', 'support_agent', 'manager');

-- Create customers table (user profiles)
CREATE TABLE public.customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create predefined_questions table
CREATE TABLE public.predefined_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    session_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    message_type public.message_type NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create escalated_queries table
CREATE TABLE public.escalated_queries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status public.escalation_status NOT NULL DEFAULT 'pending',
    assigned_to UUID REFERENCES auth.users(id),
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scooter_orders table
CREATE TABLE public.scooter_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    status public.order_status NOT NULL DEFAULT 'pending',
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    shipping_address TEXT,
    tracking_number TEXT,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_users table
CREATE TABLE public.admin_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.admin_role NOT NULL DEFAULT 'support_agent',
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predefined_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalated_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scooter_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customers
CREATE POLICY "Users can view their own profile" ON public.customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.customers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for predefined_questions (public read access)
CREATE POLICY "Anyone can view active questions" ON public.predefined_questions
    FOR SELECT USING (is_active = true);

-- Create RLS policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions
    FOR SELECT USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own chat sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions
    FOR UPDATE USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- Create RLS policies for chat_messages
CREATE POLICY "Users can view messages from their sessions" ON public.chat_messages
    FOR SELECT USING (session_id IN (
        SELECT cs.id FROM public.chat_sessions cs 
        JOIN public.customers c ON cs.customer_id = c.id 
        WHERE c.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages to their sessions" ON public.chat_messages
    FOR INSERT WITH CHECK (session_id IN (
        SELECT cs.id FROM public.chat_sessions cs 
        JOIN public.customers c ON cs.customer_id = c.id 
        WHERE c.user_id = auth.uid()
    ));

-- Create RLS policies for escalated_queries
CREATE POLICY "Users can view their own escalated queries" ON public.escalated_queries
    FOR SELECT USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own escalated queries" ON public.escalated_queries
    FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- Create RLS policies for scooter_orders
CREATE POLICY "Users can view their own orders" ON public.scooter_orders
    FOR SELECT USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- Create RLS policies for admin_users (only admins can access)
CREATE POLICY "Only admins can view admin users" ON public.admin_users
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true));

-- Create function to automatically create customer profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.customers (user_id, phone_number, full_name, email)
    VALUES (
        new.id,
        new.phone,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        COALESCE(new.email, '')
    );
    RETURN new;
END;
$$;

-- Create trigger to automatically create customer profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_predefined_questions_updated_at BEFORE UPDATE ON public.predefined_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escalated_queries_updated_at BEFORE UPDATE ON public.escalated_queries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scooter_orders_updated_at BEFORE UPDATE ON public.scooter_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_chat_sessions_customer_id ON public.chat_sessions(customer_id);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_escalated_queries_customer_id ON public.escalated_queries(customer_id);
CREATE INDEX idx_scooter_orders_customer_id ON public.scooter_orders(customer_id);
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);