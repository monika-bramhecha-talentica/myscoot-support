import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Search, MessageSquare, User, Calendar, Clock, Star, Eye } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  user_id: string;
}

interface ChatSession {
  id: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  customer_id: string;
  customer: Customer;
  message_count: number;
  last_message_at: string;
}

interface ChatMessage {
  id: string;
  content: string;
  message_type: 'user' | 'bot';
  created_at: string;
  session_id: string;
}

export const CustomerQueries: React.FC = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      // First get all chat sessions with customer info
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          customers (
            id,
            full_name,
            phone_number,
            email,
            user_id
          )
        `)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get message counts for each session
      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact' })
            .eq('session_id', session.id);

          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...session,
            customer: session.customers,
            message_count: count || 0,
            last_message_at: lastMessage?.created_at || session.created_at
          };
        })
      );

      setSessions(sessionsWithCounts);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load customer queries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive",
      });
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleViewSession = (session: ChatSession) => {
    setSelectedSession(session);
    loadMessages(session.id);
    setIsDialogOpen(true);
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.session_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && session.is_active) ||
      (filterStatus === 'inactive' && !session.is_active);

    return matchesSearch && matchesFilter;
  });

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
        <h2 className="text-2xl font-bold">Customer Queries</h2>
        <p className="text-muted-foreground">
          Monitor and manage all customer chat sessions and support queries
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, email, or session..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="active">Active Sessions</SelectItem>
            <SelectItem value="inactive">Completed Sessions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Loading customer queries...</p>
            </CardContent>
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No sessions found matching your search' : 'No customer queries yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={session.is_active ? "default" : "secondary"}>
                        {session.is_active ? "Active" : "Completed"}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {session.message_count} messages
                      </Badge>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold">
                        {session.session_name || 'Untitled Session'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {session.customer?.full_name || 'Unknown Customer'}
                        </div>
                        {session.customer?.email && (
                          <span>{session.customer.email}</span>
                        )}
                        {session.customer?.phone_number && (
                          <span>{session.customer.phone_number}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Started: {formatDate(session.created_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last activity: {formatDate(session.last_message_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewSession(session)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Chat Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedSession?.session_name || 'Chat Session'}
            </DialogTitle>
            <DialogDescription>
              {selectedSession && (
                <div className="flex items-center gap-4 text-sm">
                  <span>Customer: {selectedSession.customer?.full_name}</span>
                  <span>•</span>
                  <span>Started: {formatDate(selectedSession.created_at)}</span>
                  <span>•</span>
                  <Badge variant={selectedSession.is_active ? "default" : "secondary"}>
                    {selectedSession.is_active ? "Active" : "Completed"}
                  </Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-96 w-full border rounded-lg p-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No messages in this session</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.message_type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.message_type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge 
                          variant={message.message_type === 'user' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {message.message_type === 'user' ? 'Customer' : 'Support'}
                        </Badge>
                        <span className="text-xs opacity-70">
                          {new Date(message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};