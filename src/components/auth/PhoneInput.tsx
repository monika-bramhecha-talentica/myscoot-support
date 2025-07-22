import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhoneInputProps {
  onSubmit: (phone: string) => Promise<{ error: any }>;
  loading: boolean;
  onNext: () => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ onSubmit, loading, onNext }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const validatePhone = (phoneNumber: string): boolean => {
    // Enhanced phone validation for international numbers
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  };

  const formatPhone = (value: string): string => {
    // Remove all non-numeric characters except +
    const cleaned = value.replace(/[^\d\+]/g, '');
    
    // Add + if not present and starts with country code
    if (cleaned.length > 0 && !cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const formattedPhone = formatPhone(phone);
    
    if (!validatePhone(formattedPhone)) {
      setError('Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    try {
      const { error } = await onSubmit(formattedPhone);
      
      if (error) {
        setError(error.message || 'Failed to send OTP. Please try again.');
        toast({
          title: "Error",
          description: error.message || 'Failed to send OTP. Please try again.',
          variant: "destructive"
        });
      } else {
        toast({
          title: "OTP Sent",
          description: "Check your phone for the verification code",
        });
        onNext();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhone(e.target.value);
    setPhone(formattedValue);
    
    if (error) {
      setError('');
    }
  };

  return (
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
            Enter your phone number to get started
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={handlePhoneChange}
                className="pl-10 h-12 text-base"
                disabled={loading}
                autoComplete="tel"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive animate-fade-in">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Button 
              type="submit" 
              className="w-full h-12 text-base electric-gradient hover:opacity-90 transition-opacity"
              disabled={loading || !phone.trim()}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending OTP...</span>
                </div>
              ) : (
                'Send Verification Code'
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              By continuing, you agree to receive SMS messages for verification. 
              Message and data rates may apply.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};