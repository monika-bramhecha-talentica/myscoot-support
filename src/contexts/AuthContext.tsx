import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithOTP: (phone: string) => Promise<{ error: any }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: any }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  isAdmin: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  
  

  const checkUserRole = async (userId: string) => {
    try {
      // Check if user is admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (adminData) {
        setIsAdmin(true);
        setIsCustomer(false);
        return;
      }

      // Check if user is customer
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (customerData) {
        setIsAdmin(false);
        setIsCustomer(true);
      } else {
        // Default to customer if no role found
        setIsAdmin(false);
        setIsCustomer(true);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsAdmin(false);
      setIsCustomer(true);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role checking to avoid auth deadlock
          setTimeout(() => {
            checkUserRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsCustomer(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          checkUserRole(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithOTP = async (phone: string) => {
    // Normalize to E.164 with leading +
    const normalized = `+${phone.replace(/[^\d]/g, '')}`.replace(/^\+\+/, '+');
    console.log('Sending OTP to:', normalized);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: {
        shouldCreateUser: true
      }
    });
    
    if (error) {
      console.error('Supabase OTP error:', error);
    } else {
      console.log('OTP sent successfully via Supabase');
    }
    
    return { error };
  };

  const verifyOTP = async (phone: string, token: string) => {
    console.log('Verifying OTP for:', phone, 'token:', token);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: token,
      type: 'sms'
    });
    
    if (error) {
      console.error('Supabase OTP verification error:', error);
    } else {
      console.log('OTP verified successfully via Supabase');
    }
    
    return { error };
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signInWithOTP,
    verifyOTP,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    isAdmin,
    isCustomer
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};