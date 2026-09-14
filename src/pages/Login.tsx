import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFriendlyError = (errCode: string) => {
    switch (errCode) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return "Your email or password doesn't look right.";
      case 'auth/network-request-failed':
        return "Something went wrong. Check your connection and try again.";
      default:
        return "An error occurred while signing in. Please try again.";
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/owner/dashboard');
    } catch (err: any) {
      setError(handleFriendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/owner/dashboard');
    } catch (err: any) {
      setError(handleFriendlyError(err.code));
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* LEFT: Authentication */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">NEXA FITOS</h1>
              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
            </div>
            <p className="text-sm font-medium tracking-widest text-primary uppercase mb-8">More Than Fitness.</p>
            <h2 className="text-3xl lg:text-4xl font-display font-semibold text-foreground mt-6">Welcome back.</h2>
            <p className="text-muted-foreground mt-2">Continue your fitness journey.</p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-md">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-12 bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Forgot password?
                </button>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-12 bg-background border-border"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </Button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase tracking-wider">or continue with</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <Button type="button" variant="outline" className="w-full h-12 bg-transparent" onClick={handleGoogleLogin}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account? <Link to="/signup" className="text-primary hover:text-primary-hover font-medium transition-colors">Sign Up</Link>
          </p>
        </div>
      </div>

      {/* RIGHT: Cinematic Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-charcoal overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" 
            alt="Cinematic Gym" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-end p-16 w-full max-w-2xl">
          <h2 className="text-5xl font-display font-bold text-foreground leading-tight mb-4">
            MORE THAN<br/>FITNESS.
          </h2>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Train with purpose.<br/>
            Track every step.<br/>
            Become stronger.
          </p>
        </div>
      </div>
    </div>
  );
}
