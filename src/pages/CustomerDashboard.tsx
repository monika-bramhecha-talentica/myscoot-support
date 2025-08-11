import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquare, Upload, Star, Clock, User } from 'lucide-react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { FileUpload } from '@/components/upload/FileUpload';

interface PredefinedQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ChatSession {
  id: string;
  session_name: string;
  created_at: string;
  is_active: boolean;
}

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [predefinedQuestions, setPredefinedQuestions] = useState<PredefinedQuestion[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPredefinedQuestions();
    loadChatSessions();
  }, []);

  const loadPredefinedQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('predefined_questions')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (error) throw error;
      setPredefinedQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    }
  };

  const loadChatSessions = async () => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!customerData) return;

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChatSessions(data || []);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewChatSession = async (initialMessage?: string) => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!customerData) throw new Error('Customer profile not found');

      const sessionName = initialMessage 
        ? initialMessage.substring(0, 50) + '...'
        : `Chat Session ${new Date().toLocaleDateString()}`;

      const { data: sessionData, error } = await supabase
        .from('chat_sessions')
        .insert({
          customer_id: customerData.id,
          session_name: sessionName,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setActiveSessionId(sessionData.id);
      await loadChatSessions();

      if (initialMessage) {
        // Insert the user's initial message
        await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionData.id,
            content: initialMessage,
            message_type: 'user'
          });

        // Generate an AI response for the initial message
        try {
          const { data, error } = await supabase.functions.invoke('support-chat', {
            body: { prompt: initialMessage, sessionId: sessionData.id },
          });
          if (error) throw error;
          const aiText = (data as any)?.generatedText || 'Thanks for reaching out. A support agent will follow up shortly.';
          await supabase
            .from('chat_messages')
            .insert({
              session_id: sessionData.id,
              content: aiText,
              message_type: 'bot'
            });
        } catch (e) {
          console.error('AI response error:', e);
        }
      }

      toast({
        title: "Chat Started",
        description: "New chat session created",
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

  const handleQuestionClick = (question: PredefinedQuestion) => {
    startNewChatSession(question.question);
  };

  const handleCustomQuery = () => {
    if (!customQuery.trim()) return;
    startNewChatSession(customQuery);
    setCustomQuery('');
  };

  const categories = [...new Set(predefinedQuestions.map(q => q.category).filter(Boolean))];

  const filteredQuestions = selectedCategory
    ? predefinedQuestions.filter(q => q.category === selectedCategory)
    : predefinedQuestions;

  if (activeSessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <ChatInterface 
          sessionId={activeSessionId}
          onBack={() => setActiveSessionId(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Customer Support</h1>
          <p className="text-muted-foreground">Get help with your questions or start a conversation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Questions Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Ask a Question
                </CardTitle>
                <CardDescription>
                  Browse common questions or ask your own
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Custom Query Input */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Type your question here..."
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button 
                    onClick={handleCustomQuery}
                    disabled={!customQuery.trim()}
                    className="w-full"
                  >
                    Start Chat
                  </Button>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All Categories
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                {/* Predefined Questions */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleQuestionClick(question)}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium">{question.question}</p>
                        {question.category && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {question.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat History */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Chats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : chatSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No chat history</p>
                ) : (
                  <div className="space-y-2">
                    {chatSessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => setActiveSessionId(session.id)}
                      >
                        <p className="text-sm font-medium truncate">
                          {session.session_name || 'Untitled Chat'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <FileUpload 
              onFileUploaded={(filePath, fileName) => {
                toast({
                  title: "File Ready",
                  description: `${fileName} is ready to share in chat`,
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};