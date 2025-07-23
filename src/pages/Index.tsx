import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Shield, Phone, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user, signOut, isAdmin, isCustomer } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container-mobile py-8">
        {/* Header with user info */}
        <div className="bg-card rounded-lg p-6 glass-effect mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center electric-glow">
                {isAdmin ? (
                  <Shield className="w-6 h-6 text-primary-foreground" />
                ) : (
                  <User className="w-6 h-6 text-primary-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome to MyScoot Support</h1>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{user?.phone || 'Phone verified'}</span>
                  {isAdmin && (
                    <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs font-medium">
                      Admin
                    </span>
                  )}
                  {isCustomer && (
                    <span className="bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-medium">
                      Customer
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-card rounded-lg p-6 glass-effect">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Authentication Successful! 🎉
          </h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Your phone number has been verified and you're now logged into the MyScoot Support portal.
            </p>
            
            <div className="grid gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">User Role</h3>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? 'You have administrator access to the support portal.' : 'You have customer access to the support portal.'}
                </p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Session Management</h3>
                <p className="text-sm text-muted-foreground">
                  Your session is automatically managed and will persist across browser sessions.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="font-semibold mb-2">Available Features:</h3>
              <div className="grid gap-3">
                {isCustomer && (
                  <Button 
                    onClick={() => navigate('/support')}
                    className="justify-start"
                    variant="outline"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Customer Support Chat
                  </Button>
                )}
                <div className="text-sm text-muted-foreground">
                  <p>More features coming soon:</p>
                  <ul className="space-y-1 mt-2">
                    <li>• Order tracking system</li>
                    <li>• Support ticket management</li>
                    {isAdmin && <li>• Admin dashboard</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
