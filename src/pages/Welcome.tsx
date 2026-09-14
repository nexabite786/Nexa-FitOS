import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export function Welcome() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">NEXA FITOS</h1>
        <p className="text-lg text-slate-600">The Operating System for Modern Fitness Businesses.</p>
        
        <div className="flex flex-col space-y-3 pt-6">
          <Link to="/signup">
            <Button size="lg" className="w-full text-base">Get Started</Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="w-full text-base">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
