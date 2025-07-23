import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Star, MessageSquare, User, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
}

interface EscalatedQuery {
  id: string;
  subject: string;
  description: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  customer_id: string;
  session_id: string;
  assigned_to: string;
  customer: Customer;
}

interface LowRatedSession {
  id: string;
  session_name: string;
  rating: number;
  created_at: string;
  customer: Customer;
  message_count: number;
}

export const QueryEscalations: React.FC = () => {
  const { toast } = useToast();
  const [escalations, setEscalations] = useState<EscalatedQuery[]>([]);
  const [lowRatedSessions, setLowRatedSessions] = useState<LowRatedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEscalation, setSelectedEscalation] = useState<EscalatedQuery | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');

  useEffect(() => {
    loadEscalations();
    loadLowRatedSessions();
  }, []);

  const loadEscalations = async () => {
    try {
      const { data, error } = await supabase
        .from('escalated_queries')
        .select(`
          *,
          customers (
            id,
            full_name,
            phone_number,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const escalationsWithCustomers = (data || []).map(escalation => ({
        ...escalation,
        customer: escalation.customers
      }));
      setEscalations(escalationsWithCustomers);
    } catch (error) {
      console.error('Error loading escalations:', error);
      toast({
        title: "Error",
        description: "Failed to load escalated queries",
        variant: "destructive",
      });
    }
  };

  const loadLowRatedSessions = async () => {
    try {
      // For now, we'll simulate low-rated sessions based on session names
      // In a real implementation, you'd have a ratings table
      const { data: sessionsData, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          customers (
            id,
            full_name,
            phone_number,
            email
          )
        `)
        .like('session_name', '%Rated 1/%')
        .or('session_name.like.%Rated 2/%')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get message counts and simulate ratings
      const sessionsWithDetails = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact' })
            .eq('session_id', session.id);

          // Extract rating from session name
          const ratingMatch = session.session_name?.match(/Rated (\d+)\//);
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : 1;

          return {
            ...session,
            customer: session.customers,
            message_count: count || 0,
            rating
          };
        })
      );

      setLowRatedSessions(sessionsWithDetails);
    } catch (error) {
      console.error('Error loading low-rated sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEscalation = async () => {
    if (!selectedEscalation || !newStatus) return;

    try {
      const { error } = await supabase
        .from('escalated_queries')
        .update({
          status: newStatus as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEscalation.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: "Escalation status has been updated successfully",
      });

      setIsDialogOpen(false);
      setSelectedEscalation(null);
      setNewStatus('');
      setResponseText('');
      loadEscalations();
    } catch (error) {
      console.error('Error updating escalation:', error);
      toast({
        title: "Error",
        description: "Failed to update escalation status",
        variant: "destructive",
      });
    }
  };

  const createEscalationFromSession = async (session: LowRatedSession) => {
    try {
      const { error } = await supabase
        .from('escalated_queries')
        .insert({
          customer_id: session.customer.id,
          session_id: session.id,
          subject: `Low-rated session: ${session.session_name}`,
          description: `Customer rated this session ${session.rating}/5 stars. Please review the conversation and follow up with the customer.`,
          priority: session.rating === 1 ? 3 : 2,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Escalation Created",
        description: "Low-rated session has been escalated for review",
      });

      loadEscalations();
    } catch (error) {
      console.error('Error creating escalation:', error);
      toast({
        title: "Error",
        description: "Failed to create escalation",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'destructive';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'default';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3:
        return 'destructive';
      case 2:
        return 'default';
      case 1:
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 3:
        return 'High';
      case 2:
        return 'Medium';
      case 1:
        return 'Low';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Query Escalations & Low Ratings</h2>
        <p className="text-muted-foreground">
          Manage escalated queries and follow up on unsatisfied customer interactions
        </p>
      </div>

      {/* Escalated Queries */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Escalated Queries
        </h3>
        
        {escalations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No escalated queries at the moment</p>
            </CardContent>
          </Card>
        ) : (
          escalations.map((escalation) => (
            <Card key={escalation.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(escalation.status)}>
                        {escalation.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant={getPriorityColor(escalation.priority)}>
                        {getPriorityLabel(escalation.priority)} Priority
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">{escalation.subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {escalation.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {escalation.customer?.full_name || 'Unknown Customer'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(escalation.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEscalation(escalation);
                        setNewStatus(escalation.status);
                        setIsDialogOpen(true);
                      }}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Low-Rated Sessions */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Star className="h-5 w-5" />
          Low-Rated Sessions
        </h3>
        
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Loading ratings...</p>
            </CardContent>
          </Card>
        ) : lowRatedSessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No low-rated sessions found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Great job! All recent sessions have received good ratings.
              </p>
            </CardContent>
          </Card>
        ) : (
          lowRatedSessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= session.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      <Badge variant="outline">
                        {session.message_count} messages
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">
                        {session.session_name || 'Untitled Session'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {session.customer?.full_name || 'Unknown Customer'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(session.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createEscalationFromSession(session)}
                    >
                      Escalate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Management Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Escalated Query</DialogTitle>
            <DialogDescription>
              Update the status and add response for this escalated query
            </DialogDescription>
          </DialogHeader>
          
          {selectedEscalation && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">{selectedEscalation.subject}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedEscalation.description}
                </p>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="response">Response/Notes</Label>
                <Textarea
                  id="response"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Add your response or notes about this escalation..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateEscalation}>
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};