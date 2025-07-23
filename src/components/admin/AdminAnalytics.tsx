import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Star, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Calendar
} from 'lucide-react';

interface AnalyticsData {
  totalCustomers: number;
  totalSessions: number;
  totalMessages: number;
  activeSessions: number;
  totalQuestions: number;
  totalEscalations: number;
  pendingEscalations: number;
  averageMessagesPerSession: number;
  recentSessions: Array<{
    id: string;
    session_name: string;
    created_at: string;
    customer_name: string;
    message_count: number;
  }>;
}

interface AdminAnalyticsProps {
  detailed?: boolean;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ detailed = false }) => {
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData>({
    totalCustomers: 0,
    totalSessions: 0,
    totalMessages: 0,
    activeSessions: 0,
    totalQuestions: 0,
    totalEscalations: 0,
    pendingEscalations: 0,
    averageMessagesPerSession: 0,
    recentSessions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Load all analytics data
      const [
        customersResult,
        sessionsResult,
        messagesResult,
        questionsResult,
        escalationsResult
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact' }),
        supabase.from('chat_sessions').select('*', { count: 'exact' }),
        supabase.from('chat_messages').select('*', { count: 'exact' }),
        supabase.from('predefined_questions').select('*', { count: 'exact' }),
        supabase.from('escalated_queries').select('*', { count: 'exact' })
      ]);

      // Get active sessions
      const { count: activeSessions } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      // Get pending escalations
      const { count: pendingEscalations } = await supabase
        .from('escalated_queries')
        .select('*', { count: 'exact' })
        .eq('status', 'pending');

      // Get recent sessions with customer info
      const { data: recentSessionsData } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          session_name,
          created_at,
          customers (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get message counts for recent sessions
      const recentSessions = await Promise.all(
        (recentSessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact' })
            .eq('session_id', session.id);

          return {
            id: session.id,
            session_name: session.session_name || 'Untitled Session',
            created_at: session.created_at,
            customer_name: session.customers?.full_name || 'Unknown Customer',
            message_count: count || 0
          };
        })
      );

      const totalSessions = sessionsResult.count || 0;
      const totalMessages = messagesResult.count || 0;

      setData({
        totalCustomers: customersResult.count || 0,
        totalSessions,
        totalMessages,
        activeSessions: activeSessions || 0,
        totalQuestions: questionsResult.count || 0,
        totalEscalations: escalationsResult.count || 0,
        pendingEscalations: pendingEscalations || 0,
        averageMessagesPerSession: totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0,
        recentSessions
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Total Customers",
      value: data.totalCustomers,
      icon: Users,
      description: "Registered users"
    },
    {
      title: "Chat Sessions",
      value: data.totalSessions,
      icon: MessageSquare,
      description: `${data.activeSessions} active sessions`
    },
    {
      title: "Total Messages",
      value: data.totalMessages,
      icon: MessageSquare,
      description: `${data.averageMessagesPerSession} avg per session`
    },
    {
      title: "FAQ Questions",
      value: data.totalQuestions,
      icon: Star,
      description: "Predefined answers"
    },
    {
      title: "Escalations",
      value: data.totalEscalations,
      icon: AlertTriangle,
      description: `${data.pendingEscalations} pending review`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      {detailed && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Chat Sessions
              </CardTitle>
              <CardDescription>
                Latest customer support interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentSessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No recent sessions
                </p>
              ) : (
                <div className="space-y-3">
                  {data.recentSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{session.session_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.customer_name} • {formatDate(session.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{session.message_count}</p>
                        <p className="text-xs text-muted-foreground">messages</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Insights
              </CardTitle>
              <CardDescription>
                Key performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Active Sessions</span>
                  </div>
                  <span className="font-semibold">{data.activeSessions}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Pending Escalations</span>
                  </div>
                  <span className="font-semibold">{data.pendingEscalations}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Avg Messages/Session</span>
                  </div>
                  <span className="font-semibold">{data.averageMessagesPerSession}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Customer Engagement</span>
                  </div>
                  <span className="font-semibold">
                    {data.totalCustomers > 0 ? Math.round((data.totalSessions / data.totalCustomers) * 100) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};