import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { OTPInput } from '@/components/auth/OTPInput';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, Phone, Zap } from 'lucide-react';

type AuthStep = 'phone' | 'otp' | 'email';

export const AuthPage: React.FC = () => {
  const [step, setStep] = useState<AuthStep>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithOTP, verifyOTP, signInWithEmail, signUpWithEmail, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await signUpWithEmail(email, password);
      } else {
        result = await signInWithEmail(email, password);
      }

      if (result.error) {
        toast({
          title: "Authentication Error",
          description: result.error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: isSignUp ? "Account Created" : "Welcome Back",
          description: isSignUp ? "Please check your email to verify your account" : "Successfully signed in"
        });
        if (!isSignUp) {
          navigate('/', { replace: true });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (phone: string) => {
    setLoading(true);
    const result = await signInWithOTP(phone);
    setLoading(false);
    
    if (!result.error) {
      setPhoneNumber(phone);
    }
    
    return result;
  };

  const handleOTPVerify = async (phone: string, otp: string) => {
    setLoading(true);
    const result = await verifyOTP(phone, otp);
    setLoading(false);
    return result;
  };

  const handleOTPNext = () => {
    setStep('otp');
  };

  const handleBack = () => {
    setStep('phone');
    setPhoneNumber('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Tabs value={step} onValueChange={(value) => setStep(value as AuthStep)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <Card className="w-full max-w-md mx-auto glass-effect">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center electric-glow">
                  <Zap className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    MyScoot Support
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {isSignUp ? 'Create your account' : 'Sign in to your account'}
                  </CardDescription>
                </div>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleEmailAuth} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 text-base"
                        disabled={loading}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-base"
                      disabled={loading}
                      required
                      minLength={6}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                    />
                  </div>

                  <div className="space-y-4">
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base electric-gradient hover:opacity-90 transition-opacity"
                      disabled={loading || !email.trim() || !password.trim()}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                        </div>
                      ) : (
                        isSignUp ? 'Create Account' : 'Sign In'
                      )}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full h-12 text-base"
                      onClick={() => setIsSignUp(!isSignUp)}
                      disabled={loading}
                    >
                      {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phone">
            {step === 'phone' ? (
              <PhoneInput
                onSubmit={handlePhoneSubmit}
                loading={loading}
                onNext={handleOTPNext}
              />
            ) : (
              <OTPInput
                phone={phoneNumber}
                onVerify={handleOTPVerify}
                onResend={handlePhoneSubmit}
                onBack={handleBack}
                loading={loading}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AuthPage;