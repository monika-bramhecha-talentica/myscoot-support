import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { OTPInput } from '@/components/auth/OTPInput';
import { useAuth } from '@/contexts/AuthContext';

type AuthStep = 'phone' | 'otp';

export const AuthPage: React.FC = () => {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithOTP, verifyOTP, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

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
        {/* Hidden reCAPTCHA container for Firebase */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default AuthPage;