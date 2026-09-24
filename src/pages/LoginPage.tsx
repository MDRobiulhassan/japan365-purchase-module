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
    <div className="min-h-screen flex bg-stone-100">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-12">
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
          <p className="mt-4 text-emerald-50 text-base leading-relaxed max-w-sm">
            Manage suppliers, purchase orders, goods receipts, and invoices all in one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { title: 'Suppliers', desc: 'Vendor directory' },
              { title: 'Orders', desc: 'Full lifecycle' },
              { title: 'Invoices', desc: 'Payment tracking' },
            ].map((card) => (
              <div key={card.title} className="rounded-xl bg-white/10 backdrop-blur p-4">
                <p className="text-sm font-semibold text-white">{card.title}</p>
                <p className="text-xs text-emerald-100 mt-0.5">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-emerald-200/60">Japan 365 - Purchase Module</p>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/30">
              <Globe2 className="h-7 w-7 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-stone-800">Japan 365</h1>
            <p className="mt-1 text-sm text-stone-500">Purchase Module</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-stone-800">Welcome back</h2>
            <p className="mt-1 text-sm text-stone-500">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-700">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-11 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-2" size="lg">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Demo Accounts</p>
            {[
              { role: 'Admin', email: 'admin@japan365.com', password: 'Admin2026!', color: 'text-emerald-600' },
              { role: 'Manager', email: 'manager@japan365.com', password: 'Manager2026!', color: 'text-teal-600' },
              { role: 'Staff', email: 'staff@japan365.com', password: 'Staff2026!', color: 'text-amber-600' },
            ].map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword(acc.password); setError(null); }}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white transition-colors text-left"
              >
                <div>
                  <span className={`text-xs font-semibold ${acc.color}`}>{acc.role}</span>
                  <p className="text-xs text-stone-500 mt-0.5">{acc.email}</p>
                </div>
                <span className="text-xs text-stone-400 font-mono">{acc.password}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
