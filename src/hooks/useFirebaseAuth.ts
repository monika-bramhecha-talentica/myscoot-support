import { useState } from 'react';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { supabase } from '@/integrations/supabase/client';

export const useFirebaseAuth = () => {
  const [verificationId, setVerificationId] = useState<string>('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const setupRecaptcha = (containerId: string) => {
    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      }
    });
    return recaptchaVerifier;
  };

  const sendOTP = async (phoneNumber: string): Promise<{ error: any }> => {
    try {
      // Create reCAPTCHA verifier
      const recaptchaVerifier = setupRecaptcha('recaptcha-container');
      
      // Send OTP
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setConfirmationResult(confirmationResult);
      
      return { error: null };
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      return { error: error.message };
    }
  };

  const verifyOTP = async (otp: string): Promise<{ error: any, phoneNumber?: string }> => {
    try {
      if (!confirmationResult) {
        return { error: 'No verification in progress' };
      }

      // Verify the OTP with Firebase
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;
      const phoneNumber = firebaseUser.phoneNumber;

      if (!phoneNumber) {
        return { error: 'Phone number not found' };
      }

      // Create or sign in user with Supabase using the verified phone number
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: {
          shouldCreateUser: true,
          data: {
            phone_verified: true,
            firebase_uid: firebaseUser.uid
          }
        }
      });

      if (error) {
        // If user doesn't exist, create them
        if (error.message.includes('User not found')) {
          // Since we can't directly create a user with phone in Supabase,
          // we'll use a different approach - create an anonymous user and link the phone
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            phone: phoneNumber,
            password: Math.random().toString(36), // Random password
          });

          if (signUpError) {
            return { error: signUpError.message };
          }
        } else {
          return { error: error.message };
        }
      }

      return { error: null, phoneNumber };
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      return { error: error.message };
    }
  };

  return {
    sendOTP,
    verifyOTP,
    verificationId
  };
};