import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, MapPin, Calendar, DollarSign, MessageSquare } from 'lucide-react';

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

interface OrderLookupProps {
  onOrderSelect?: (order: Order) => void;
  onStartChat?: (orderNumber: string) => void;
}

export const OrderLookup: React.FC<OrderLookupProps> = ({ onOrderSelect, onStartChat }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadUserOrders();
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, orders]);

  const loadUserOrders = async () => {
    if (!user) return;

    try {
      // Get customer ID first
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customerData) {
        setOrders([]);
        return;
      }

      // Get orders for this customer
      const { data: ordersData, error: ordersError } = await supabase
        .from('scooter_orders')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
      
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load your orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = orders.filter(order => 
      order.order_number.toLowerCase().includes(query) ||
      order.product_name.toLowerCase().includes(query) ||
      order.tracking_number?.toLowerCase().includes(query)
    );
    
    setFilteredOrders(filtered);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter an order number or tracking number",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    try {
      // If user is not logged in, allow guest search by order number
      const { data: orderData, error } = await supabase
        .from('scooter_orders')
        .select('*')
        .or(`order_number.ilike.%${searchQuery}%,tracking_number.ilike.%${searchQuery}%`)
        .maybeSingle();

      if (error) throw error;

      if (orderData) {
        setFilteredOrders([orderData]);
        if (onOrderSelect) {
          onOrderSelect(orderData);
        }
      } else {
        toast({
          title: "Order Not Found",
          description: "No order found with that number or tracking number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for order",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'confirmed':
        return 'default';
      case 'processing':
        return 'default';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Order Lookup
          </CardTitle>
          <CardDescription>
            Search for your orders using order number, tracking number, or product name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter order number, tracking number, or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch}
              disabled={searching}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading your orders...</p>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {searchQuery ? 'No orders found matching your search' : 'No orders found'}
              </p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {user ? 'Your orders will appear here once you make a purchase' : 'Enter an order number to track your order'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Order Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(order.status)} className="capitalize">
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status}</span>
                      </Badge>
                    </div>
                    <div>
                      <p className="font-semibold">{order.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Order #{order.order_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(order.order_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(order.total_amount || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Shipping Details</h4>
                    {order.shipping_address && (
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {order.shipping_address}
                        </p>
                      </div>
                    )}
                    {order.tracking_number && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tracking Number</p>
                        <p className="text-sm font-mono">{order.tracking_number}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 md:items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOrderSelect && onOrderSelect(order)}
                    >
                      View Details
                    </Button>
                    {onStartChat && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStartChat(order.order_number)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Chat About Order
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};