import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Send, Paperclip, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FileUpload } from '@/components/upload/FileUpload';

interface ChatMessage {
  id: string;
  content: string;
  message_type: 'user' | 'bot';
  created_at: string;
  metadata?: any;
}

interface ChatInterfaceProps {
  sessionId: string;
  onBack: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionRating, setSessionRating] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannel = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    setupRealtimeSubscription();
    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
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
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    realtimeChannel.current = supabase
      .channel(`chat_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Send user message
      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          content: messageContent,
          message_type: 'user'
        });

      if (userMessageError) throw userMessageError;

      // Invoke AI edge function for real response
      try {
        const { data, error } = await supabase.functions.invoke('support-chat', {
          body: {
            prompt: messageContent,
            sessionId,
          },
        });

        if (error) throw error;

        const aiText = (data as any)?.generatedText || 'Sorry, I could not generate a response.';
        await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            content: aiText,
            message_type: 'bot'
          });
      } catch (e) {
        console.error('AI response error:', e);
        toast({
          title: "AI Error",
          description: "Failed to generate AI response.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRating = async (rating: number) => {
    try {
      setSessionRating(rating);
      
      // Store rating in session metadata or separate rating table
      const { error } = await supabase
        .from('chat_sessions')
        .update({ 
          session_name: `Rated ${rating}/5 - ${new Date().toLocaleDateString()}`
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Rating Submitted",
        description: `Thank you for rating this conversation ${rating}/5 stars!`,
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="container mx-auto max-w-4xl h-screen flex flex-col">
      {/* Header */}
      <Card className="rounded-b-none border-b-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-lg">Support Chat</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Session ID: {sessionId.slice(0, 8)}...
                </p>
              </div>
            </div>
            {/* Rating Section */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rate this chat:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRating(star)}
                  className="p-1"
                >
                  <Star 
                    className={`h-4 w-4 ${
                      sessionRating && star <= sessionRating 
                        ? 'fill-primary text-primary' 
                        : 'text-muted-foreground'
                    }`} 
                  />
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 rounded-none border-t-0 border-b-0">
        <CardContent className="p-0 h-full">
          <ScrollArea className="h-full p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
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
                          {message.message_type === 'user' ? 'You' : 'Support'}
                        </Badge>
                        <span className="text-xs opacity-70">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Input */}
      <Card className="rounded-t-none border-t-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Upload Files</SheetTitle>
                  <SheetDescription>
                    Share documents or images with support
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <FileUpload 
                    sessionId={sessionId}
                    onFileUploaded={(filePath, fileName) => {
                      toast({
                        title: "File Uploaded",
                        description: `${fileName} has been shared with support`,
                      });
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};