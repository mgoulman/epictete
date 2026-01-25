'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/hooks';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setIsLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  return (
    <div style={{ width: '100%', maxWidth: '380px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: '#EDE6D6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(96, 99, 56, 0.2)',
          overflow: 'hidden'
        }}>
          <Image
            src="/logos/logo-icon.png"
            alt="Epictète"
            width={72}
            height={72}
            style={{ width: '72px', height: '72px', objectFit: 'cover' }}
          />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'white', margin: 0 }}>
          Sign in to Epictète
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>
          Enter your credentials to continue
        </p>
      </div>

      <div style={{
        background: '#1a1a18',
        border: '1px solid #2d2d28',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#faf9f5',
                marginBottom: '6px'
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#141413',
                border: '1px solid #2d2d28',
                borderRadius: '8px',
                color: '#faf9f5',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#606338'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#2d2d28'; }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#faf9f5',
                marginBottom: '6px'
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#141413',
                border: '1px solid #2d2d28',
                borderRadius: '8px',
                color: '#faf9f5',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#606338'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#2d2d28'; }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              background: isLoading ? '#4d4f2e' : 'linear-gradient(135deg, #606338, #4d4f2e)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }} viewBox="0 0 24 24">
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
