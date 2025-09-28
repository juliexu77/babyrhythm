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
import { Baby, Heart, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const redirectTo = searchParams.get('redirect');
    
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (redirectTo) {
          navigate(redirectTo, { replace: true });
        } else {
          navigate("/app", { replace: true });
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (redirectTo) {
          navigate(redirectTo, { replace: true });
        } else {
          navigate("/app", { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Language Toggle */}
        <div className="flex justify-end mb-6">
          <LanguageToggle />
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center backdrop-blur-sm">
              <Baby className="w-6 h-6 text-foreground" />
            </div>
            <Heart className="w-5 h-5 text-accent/80" />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-2 tracking-tight leading-tight">
            {t('appName')}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('tagline')}
          </p>
        </div>

        {/* Auth Forms */}
        <Card className="border-border bg-card/95 backdrop-blur-sm shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-foreground text-xl font-sans font-medium">
              {t('welcome')}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground text-sm leading-relaxed">
              {t('signInToAccount')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">{t('signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('signUp')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-white dark:bg-white text-gray-700 dark:text-gray-700 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-50"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {t('signInWithGoogle')}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {t('orContinueWith')}
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

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-white dark:bg-white text-gray-700 dark:text-gray-700 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-50"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {t('signInWithGoogle')}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {t('orContinueWith')}
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