import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  MessageSquare, 
  HelpCircle, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Settings,
  Activity
} from 'lucide-react';
import { AdminQuestions } from '@/components/admin/AdminQuestions';
import { CustomerQueries } from '@/components/admin/CustomerQueries';
import { QueryEscalations } from '@/components/admin/QueryEscalations';
import { QueryManagement } from '@/components/admin/QueryManagement';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need administrator privileges to access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage support system and monitor customer interactions
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Activity className="h-3 w-3 mr-1" />
            Administrator Access
          </Badge>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="queries" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Queries
            </TabsTrigger>
            <TabsTrigger value="escalations" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Escalations
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="questions">
            <AdminQuestions />
          </TabsContent>

          <TabsContent value="queries">
            <CustomerQueries />
          </TabsContent>

          <TabsContent value="escalations">
            <QueryEscalations />
          </TabsContent>

          <TabsContent value="management">
            <QueryManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Analytics</CardTitle>
                  <CardDescription>
                    Comprehensive metrics and reporting dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminAnalytics detailed />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};