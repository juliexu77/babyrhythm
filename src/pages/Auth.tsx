import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Baby, Heart, Mail, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    // Auth state changes are handled by RouteGuard
    // Just listen for sign-in to close the loading state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("signup-email") as string;
    const password = formData.get("signup-password") as string;
    const fullName = formData.get("full-name") as string;

    const redirectUrl = `${window.location.origin}/app`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    const redirectUrl = `${window.location.origin}/app`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("signin-email") as string;
    const password = formData.get("signin-password") as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md relative z-10">
        
        {/* Header - Strava style */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl text-strong uppercase tracking-wide">
            BabyRhythm
          </h1>
          <p className="text-body-muted">
            Track your baby's daily rhythm
          </p>
        </div>

        {/* Auth Forms */}
        <Card 
          className="overflow-hidden"
        >
          <CardContent className="pt-6">
            {mode === 'signup' ? (
              <form onSubmit={handleSignUp} className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full"
                >
                  <img src="/google-logo.svg" alt="Google" className="mr-2 h-4 w-4" />
                  Sign up with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-card text-label-xs text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full-name">{t('fullName')}</Label>
                  <Input
                    id="full-name"
                    name="full-name"
                    type="text"
                    placeholder={t('fullName')}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('email')}</Label>
                  <Input
                    id="signup-email"
                    name="signup-email"
                    type="email"
                    placeholder={t('enterEmail')}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('password')}</Label>
                  <Input
                    id="signup-password"
                    name="signup-password"
                    type="password"
                    placeholder={t('enterPassword')}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? t('settingUp') : t('createAccount')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full"
                >
                  <img src="/google-logo.svg" alt="Google" className="mr-2 h-4 w-4" />
                  Sign in with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-card text-label-xs text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('email')}</Label>
                  <Input
                    id="signin-email"
                    name="signin-email"
                    type="email"
                    placeholder={t('enterEmail')}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t('password')}</Label>
                  <Input
                    id="signin-password"
                    name="signin-password"
                    type="password"
                    placeholder={t('enterPassword')}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? t('loading') : t('signIn')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        
        {/* Toggle between sign up and sign in */}
        <p className="text-center text-body-muted mt-6">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Auth;