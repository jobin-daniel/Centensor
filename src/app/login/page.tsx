'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

interface DbStatus {
  state: 'checking' | 'connected' | 'error';
  engine?: string;
  userCount?: number;
  message?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocalHost, setIsLocalHost] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>({ state: 'checking' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      setIsLocalHost(host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.local'));
    }

    const checkDb = async () => {
      try {
        const res = await fetch('/api/health/db');
        const data = await res.json();
        if (res.ok && data.status === 'connected') {
          setDbStatus({
            state: 'connected',
            engine: data.engine,
            userCount: data.userCount,
          });
        } else {
          setDbStatus({
            state: 'error',
            message: data.message || data.error || `HTTP ${res.status}: Database ping failed`,
          });
        }
      } catch (err: any) {
        setDbStatus({
          state: 'error',
          message: err.message || 'Failed to ping database',
        });
      }
    };

    checkDb();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@centensor.com');
    setPassword('Password123!');
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #09090b 60%, #030712 100%)',
        padding: '24px',
        color: 'var(--text-primary)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(18, 18, 23, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.15)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Welcome to <span style={{ color: '#ec4899' }}>Cent</span><span style={{ color: '#a78bfa' }}>ensor</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Sign in to access your multi-currency general ledgers & analytics
          </p>

          {/* Database Health & Connectivity Light */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
            <div
              title={
                dbStatus.state === 'connected'
                  ? `Connected to ${dbStatus.engine} (${dbStatus.userCount ?? 0} users in database)`
                  : dbStatus.message
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 14px',
                borderRadius: '9999px',
                background:
                  dbStatus.state === 'connected'
                    ? 'rgba(34, 197, 94, 0.12)'
                    : dbStatus.state === 'error'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(234, 179, 8, 0.12)',
                border: `1px solid ${
                  dbStatus.state === 'connected'
                    ? 'rgba(34, 197, 94, 0.35)'
                    : dbStatus.state === 'error'
                    ? 'rgba(239, 68, 68, 0.35)'
                    : 'rgba(234, 179, 8, 0.35)'
                }`,
                fontSize: '12px',
                fontWeight: 600,
                color:
                  dbStatus.state === 'connected'
                    ? '#4ade80'
                    : dbStatus.state === 'error'
                    ? '#f87171'
                    : '#fde047',
                transition: 'all 0.3s ease',
              }}
            >
              <span
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '9px',
                  height: '9px',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor:
                      dbStatus.state === 'connected'
                        ? '#22c55e'
                        : dbStatus.state === 'error'
                        ? '#ef4444'
                        : '#eab308',
                    opacity: 0.6,
                    transform: dbStatus.state === 'connected' ? 'scale(1.6)' : 'none',
                    filter: 'blur(2px)',
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor:
                      dbStatus.state === 'connected'
                        ? '#22c55e'
                        : dbStatus.state === 'error'
                        ? '#ef4444'
                        : '#eab308',
                    boxShadow:
                      dbStatus.state === 'connected'
                        ? '0 0 10px #22c55e, 0 0 4px #22c55e'
                        : dbStatus.state === 'error'
                        ? '0 0 10px #ef4444'
                        : '0 0 10px #eab308',
                  }}
                />
              </span>
              <span>
                {dbStatus.state === 'connected'
                  ? `Database Connected (${dbStatus.engine?.includes('D1') ? 'Cloudflare D1' : 'SQLite'})`
                  : dbStatus.state === 'error'
                  ? `Database Offline: ${dbStatus.message || 'Connection failed'}`
                  : 'Pinging database...'}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(139, 92, 246, 0.8)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                }}
              >
                Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(139, 92, 246, 0.8)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px',
              marginTop: '8px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              border: 'none',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 10px 20px -5px rgba(139, 92, 246, 0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In to Centensor</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Helper (Localhost / Dev only) */}
        {isLocalHost && (
          <div
            style={{
              marginTop: '24px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px dashed rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#a78bfa" />
              <div style={{ fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>Demo Account Ready</div>
                <div style={{ color: 'var(--text-muted)' }}>demo@centensor.com</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.25)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fill Demo
            </button>
          </div>
        )}

        {/* Footer Link to Register */}
        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don&apos;t have an account yet?{' '}
          <Link
            href="/register"
            style={{
              color: '#a78bfa',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
