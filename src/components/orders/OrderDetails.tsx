import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Phone,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

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

interface OrderDetailsProps {
  order: Order;
  onStartChat?: (orderNumber: string) => void;
  onBack?: () => void;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onStartChat, onBack }) => {
  const getStatusProgress = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 10;
      case 'confirmed':
        return 25;
      case 'processing':
        return 50;
      case 'shipped':
        return 75;
      case 'delivered':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const getStatusSteps = (currentStatus: Order['status']) => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: Clock },
      { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle },
      { key: 'processing', label: 'Processing', icon: Package },
      { key: 'shipped', label: 'Shipped', icon: Truck },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle }
    ];

    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex && currentStatus !== 'cancelled',
      active: index === currentIndex && currentStatus !== 'cancelled',
      cancelled: currentStatus === 'cancelled'
    }));
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const steps = getStatusSteps(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            ← Back to Orders
          </Button>
        )}
        <div className="flex gap-2">
          {onStartChat && (
            <Button variant="outline" onClick={() => onStartChat(order.order_number)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat About This Order
            </Button>
          )}
          <Button variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Call Support
          </Button>
        </div>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{order.product_name}</CardTitle>
              <CardDescription>Order #{order.order_number}</CardDescription>
            </div>
            <Badge variant={getStatusColor(order.status)} className="capitalize text-sm">
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Order Date</p>
              <p className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(order.order_date)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="flex items-center gap-1 text-lg font-semibold">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(order.total_amount || 0)}
              </p>
            </div>
            {order.tracking_number && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tracking Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm">{order.tracking_number}</p>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
          <CardDescription>Track your order progress</CardDescription>
        </CardHeader>
        <CardContent>
          {order.status === 'cancelled' ? (
            <div className="flex items-center gap-3 p-4 border border-destructive rounded-lg bg-destructive/5">
              <XCircle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Order Cancelled</p>
                <p className="text-sm text-muted-foreground">
                  This order has been cancelled. Contact support if you have questions.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{getStatusProgress(order.status)}%</span>
                </div>
                <Progress value={getStatusProgress(order.status)} className="h-2" />
              </div>

              {/* Status Steps */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex items-center gap-4">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full border-2
                        ${step.completed || step.active 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'border-muted bg-background text-muted-foreground'
                        }
                      `}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          step.completed || step.active ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {step.label}
                        </p>
                        {step.active && (
                          <p className="text-sm text-muted-foreground">Current status</p>
                        )}
                      </div>
                      {step.completed && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Information */}
      {order.shipping_address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                <p className="whitespace-pre-line">{order.shipping_address}</p>
              </div>
              
              {order.status === 'shipped' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <p className="font-medium text-blue-900">Your order is on the way!</p>
                  </div>
                  <p className="text-sm text-blue-700">
                    Your package is in transit and should arrive within 2-3 business days.
                  </p>
                </div>
              )}

              {order.status === 'delivered' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="font-medium text-green-900">Order Delivered!</p>
                  </div>
                  <p className="text-sm text-green-700">
                    Your order has been successfully delivered. Enjoy your new scooter!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Need Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Get support with your order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {onStartChat && (
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-start"
                onClick={() => onStartChat(order.order_number)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-5 w-5" />
                  <span className="font-medium">Chat with Support</span>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  Get instant help about this specific order
                </p>
              </Button>
            )}
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-5 w-5" />
                <span className="font-medium">Call Support</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Speak directly with our support team
              </p>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};