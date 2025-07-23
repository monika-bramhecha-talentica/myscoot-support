import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OrderLookup } from '@/components/orders/OrderLookup';
import { OrderDetails } from '@/components/orders/OrderDetails';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Order {
  id: string;
  order_number: string;
  product_name: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  order_date: string;
  shipping_address: string;
  tracking_number: string;
  created_at: string;
}

type ViewMode = 'lookup' | 'details' | 'chat';

export const OrderPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('lookup');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
    setViewMode('details');
  };

  const handleStartChat = async (orderNumber: string) => {
    if (!user) return;

    try {
      // Get customer ID
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customerData) throw new Error('Customer profile not found');

      // Create a new chat session for this order
      const sessionName = `Order Inquiry: ${orderNumber}`;
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          customer_id: customerData.id,
          session_name: sessionName,
          is_active: true
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Send initial message about the order
      await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionData.id,
          content: `Hi! I have a question about my order ${orderNumber}. Can you help me with the status and details?`,
          message_type: 'user'
        });

      setChatSessionId(sessionData.id);
      setViewMode('chat');

      toast({
        title: "Chat Started",
        description: `Started chat session for order ${orderNumber}`,
      });

    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat session",
        variant: "destructive",
      });
    }
  };

  const handleBackToLookup = () => {
    setViewMode('lookup');
    setSelectedOrder(null);
    setChatSessionId(null);
  };

  const handleBackToDetails = () => {
    setViewMode('details');
    setChatSessionId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Order Tracking</h1>
          <p className="text-muted-foreground">
            Track your orders, view delivery status, and get support
          </p>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'lookup' && (
          <OrderLookup 
            onOrderSelect={handleOrderSelect}
            onStartChat={handleStartChat}
          />
        )}

        {viewMode === 'details' && selectedOrder && (
          <OrderDetails 
            order={selectedOrder}
            onStartChat={handleStartChat}
            onBack={handleBackToLookup}
          />
        )}

        {viewMode === 'chat' && chatSessionId && (
          <ChatInterface 
            sessionId={chatSessionId}
            onBack={selectedOrder ? handleBackToDetails : handleBackToLookup}
          />
        )}
      </div>
    </div>
  );
};

export default OrderPage;