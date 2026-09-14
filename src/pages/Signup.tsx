import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFriendlyError = (errCode: string) => {
    switch (errCode) {
      case 'auth/email-already-in-use':
        return "An account with this email already exists.";
      case 'auth/weak-password':
        return "Please choose a stronger password (at least 6 characters).";
      case 'auth/invalid-email':
        return "Please enter a valid email address.";
      case 'auth/network-request-failed':
        return "Something went wrong. Check your connection and try again.";
      default:
        return "An error occurred while signing up. Please try again.";
    }
  };

  const createInitialUserDoc = async (uid: string, fName: string, lName: string, emailStr: string) => {
    await setDoc(doc(db, 'users', uid), {
      firstName: fName,
      lastName: lName,
      email: emailStr,
      role: 'SYSTEM_USER',
      createdAt: new Date().toISOString(),
      onboardingComplete: false
    });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`
      });
      await createInitialUserDoc(userCredential.user.uid, firstName, lastName, email);
      navigate('/onboarding');
    } catch (err: any) {
      setError(handleFriendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const names = user.displayName ? user.displayName.split(' ') : ['User', ''];
      const fName = names[0];
      const lName = names.slice(1).join(' ') || '';
      
      await createInitialUserDoc(user.uid, fName, lName, user.email || '');
      navigate('/onboarding');
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
            <h2 className="text-3xl lg:text-4xl font-display font-semibold text-foreground mt-6">Start Your Journey.</h2>
            <p className="text-muted-foreground mt-2">Build your fitness business with NEXA FITOS.</p>
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-md">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  required 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  required 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 bg-background border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-background border-border"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </Button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <Button type="button" variant="outline" className="w-full h-12 bg-transparent" onClick={handleGoogleSignup}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account? <Link to="/login" className="text-primary hover:text-primary-hover font-medium transition-colors">Sign In</Link>
          </p>
        </div>
      </div>

      {/* RIGHT: Cinematic Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-charcoal overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop" 
            alt="Cinematic Training" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-end p-16 w-full max-w-2xl">
          <h2 className="text-5xl font-display font-bold text-foreground leading-tight mb-4">
            BUILD<br/>STRONGER.
          </h2>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            The platform for elite coaches to build,<br/>
            manage, and scale their business.
          </p>
        </div>
      </div>
    </div>
  );
}
