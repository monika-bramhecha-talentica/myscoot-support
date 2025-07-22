import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OTPInputProps {
  phone: string;
  onVerify: (phone: string, otp: string) => Promise<{ error: any }>;
  onResend: (phone: string) => Promise<{ error: any }>;
  onBack: () => void;
  loading: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({ 
  phone, 
  onVerify, 
  onResend, 
  onBack, 
  loading 
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste scenario
      const pastedData = value.slice(0, 6).split('');
      const newOtp = [...otp];
      
      pastedData.forEach((digit, i) => {
        if (index + i < 6 && /^\d$/.test(digit)) {
          newOtp[index + i] = digit;
        }
      });
      
      setOtp(newOtp);
      
      // Focus on the next empty input or the last input
      const nextIndex = Math.min(index + pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else if (/^\d$/.test(value) || value === '') {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    if (error) {
      setError('');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    try {
      const { error } = await onVerify(phone, otpString);
      
      if (error) {
        setError(error.message || 'Invalid verification code. Please try again.');
        toast({
          title: "Verification Failed",
          description: error.message || 'Invalid verification code. Please try again.',
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Phone number verified successfully!",
        });
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setResendLoading(true);
    setError('');

    try {
      const { error } = await onResend(phone);
      
      if (error) {
        toast({
          title: "Error",
          description: error.message || 'Failed to resend code. Please try again.',
          variant: "destructive"
        });
      } else {
        toast({
          title: "Code Sent",
          description: "New verification code sent to your phone",
        });
        setResendCooldown(60); // 60 second cooldown
        setOtp(['', '', '', '', '', '']); // Clear current OTP
        inputRefs.current[0]?.focus(); // Focus first input
      }
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to resend code. Please try again.',
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };

  const maskedPhone = phone.replace(/(\+\d{1,3})\d{6,}(\d{4})/, '$1***$2');

  return (
    <Card className="w-full max-w-md mx-auto glass-effect">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center electric-glow">
          <Shield className="w-8 h-8 text-secondary-foreground" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">
            Verify Your Phone
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Enter the 6-digit code sent to {maskedPhone}
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label className="text-sm font-medium">Verification Code</Label>
            <div className="flex justify-center space-x-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-bold border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-background transition-colors"
                  disabled={loading}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                />
              ))}
            </div>
            {error && (
              <p className="text-sm text-destructive text-center animate-fade-in">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button 
              type="submit" 
              className="w-full h-12 text-base electric-gradient hover:opacity-90 transition-opacity"
              disabled={loading || otp.join('').length !== 6}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                'Verify & Continue'
              )}
            </Button>

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="text-sm"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Change Number
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleResend}
                disabled={resendLoading || resendCooldown > 0}
                className="text-sm"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};