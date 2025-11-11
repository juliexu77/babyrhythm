import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Baby, Heart, Mail, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
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
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your registration.",
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
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Language Toggle */}
        <div className="flex justify-end mb-6">
          <LanguageToggle />
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6 relative">
            {/* Circular glow behind icon - brighter */}
            <div className="absolute w-16 h-16 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-xl opacity-75"></div>
            <Activity className="auth-icon w-8 h-8 text-primary relative z-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-[22px] md:text-[36px] font-medium mb-6 tracking-tight" style={{ lineHeight: '1.25', color: 'rgba(180, 180, 180, 0.95)' }}>
            Step into the rhythm
          </h1>
          <p className="text-[15px] md:text-[16px] leading-[1.6] font-normal max-w-md mx-auto" style={{ color: 'rgba(160, 160, 160, 0.85)' }}>
            Create an account to start tracking and reflecting your baby's day — and let BabyRhythm guide you toward balance, predictability, and peace of mind.
          </p>
        </div>

        {/* Auth Forms */}
        <Card className="card border border-border shadow-card">
          <CardHeader className="pb-4">
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signup">{t('signUp')}</TabsTrigger>
                <TabsTrigger value="signin">{t('signIn')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full font-semibold"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Sign up with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
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
                    <Label htmlFor="signup-password" className="text-sm font-medium">{t('password')}</Label>
                    <Input
                      id="signup-password"
                      name="signup-password"
                      type="password"
                      placeholder={t('enterPassword')}
                      required
                      disabled={isLoading}
                      className="text-sm"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full font-semibold" 
                    disabled={isLoading}
                  >
                    {isLoading ? t('settingUp') : t('createAccount')}
                  </Button>
                  
                  {/* Microcopy */}
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]');
                        const signinTab = tabsList?.querySelector('[value="signin"]') as HTMLElement;
                        signinTab?.click();
                      }}
                      className="text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full font-semibold"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Sign in with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
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
                    <Label htmlFor="signin-password" className="text-sm font-medium">{t('password')}</Label>
                    <Input
                      id="signin-password"
                      name="signin-password"
                      type="password"
                      placeholder={t('enterPassword')}
                      required
                      disabled={isLoading}
                      className="text-sm"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full font-semibold" 
                    disabled={isLoading}
                  >
                    {isLoading ? t('loading') : t('signIn')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;