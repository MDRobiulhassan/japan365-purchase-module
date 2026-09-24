import { useState } from 'react';
import { Globe2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Globe2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Japan 365</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            Procurement.<br />Simplified.
          </h2>
          <p className="mt-4 text-blue-100 text-base leading-relaxed max-w-sm">
            Manage suppliers, purchase orders, goods receipts, and invoices — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[['Suppliers', 'Vendor directory'], ['Orders', 'Full lifecycle'], ['Invoices', 'Payment tracking']].map(([title, desc]) => (
              <div key={title} className="rounded-xl bg-white/10 backdrop-blur p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-blue-200 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-blue-200/60">Japan 365 — Purchase Module</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
              <Globe2 className="h-7 w-7 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white">Japan 365</h1>
            <p className="mt-1 text-sm text-slate-400">Purchase Module</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-400">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-2" size="lg">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Demo Accounts</p>
            {[
              { role: 'Admin', email: 'admin@japan365.com', password: 'Admin2026!', color: 'text-blue-400' },
              { role: 'Manager', email: 'manager@japan365.com', password: 'Manager2026!', color: 'text-emerald-400' },
              { role: 'Staff', email: 'staff@japan365.com', password: 'Staff2026!', color: 'text-amber-400' },
            ].map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword(acc.password); setError(null); }}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-800 transition-colors text-left"
              >
                <div>
                  <span className={`text-xs font-semibold ${acc.color}`}>{acc.role}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{acc.email}</p>
                </div>
                <span className="text-xs text-slate-600 font-mono">{acc.password}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
