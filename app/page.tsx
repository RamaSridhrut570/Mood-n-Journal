'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogIn } from 'lucide-react';

export default function LandingPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
        <h1 className="text-3xl font-serif text-gray-900 dark:text-white mb-2">Reflective Journal</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          A secure space for your thoughts, with AI-powered reflections to help you brainstorm and reflect.
        </p>
        
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 py-3 px-4 rounded-xl font-medium transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
