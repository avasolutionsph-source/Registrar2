import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import npsLogo from '@/assets/nps-logo.png';
import cover from '@/assets/cover.jpeg';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/students" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    const target = email.toLowerCase().includes('guidance') ? '/guidance' : '/students';
    navigate(target);
  }

  return (
    <div
      className="min-h-screen relative bg-app"
      style={{
        backgroundImage: `url(${cover})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Vignette overlay — center stays moderately clear, edges and corners fade
          to a deeper darkness. Cinematic frame around the composition. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(31,31,27,0.35) 0%, rgba(31,31,27,0.62) 55%, rgba(31,31,27,0.86) 100%)',
        }}
        aria-hidden="true"
      />
      {/* Light extra darken on the left half for white-text legibility — sits on
          top of the vignette and tapers to nothing past the middle. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-ink-primary/40 via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Capped inner container — narrower cap + center-justify so the welcome
          text and card cluster together instead of pinning to opposite edges. */}
      <div className="relative min-h-screen flex items-center">
        <div className="w-full max-w-6xl 2xl:max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 2xl:px-24 py-12 2xl:py-20 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 2xl:gap-20">
          {/* Left — welcome text */}
          <div className="flex-1 max-w-xl 2xl:max-w-2xl text-white text-center md:text-left">
            <div className="inline-block w-12 2xl:w-16 h-[3px] 2xl:h-1 bg-nps-red mb-5 2xl:mb-7" aria-hidden="true" />
            <p className="text-[16px] md:text-[18px] 2xl:text-[20px] text-white/85 mb-2 drop-shadow-sm">
              Welcome to
            </p>
            <h1 className="font-serif font-bold text-[34px] md:text-[44px] lg:text-[52px] 2xl:text-[64px] leading-[1.05] tracking-tight drop-shadow">
              Naga Parochial School
            </h1>
            <p className="text-[14px] md:text-[16px] 2xl:text-[18px] text-white/80 mt-4 2xl:mt-6 max-w-md 2xl:max-w-lg mx-auto md:mx-0 drop-shadow-sm">
              Excellence in education. Service to the community.
            </p>
          </div>

          {/* Right — solid white card */}
          <form
            onSubmit={onSubmit}
            className="w-full md:w-auto md:flex-shrink-0 max-w-[440px] 2xl:max-w-[500px] bg-panel rounded-2xl shadow-2xl shadow-ink-primary/40 px-7 md:px-9 2xl:px-11 py-8 md:py-10 2xl:py-12 flex flex-col"
          >
            {/* Hero inside card */}
            <div className="flex flex-col items-center text-center">
              <img
                src={npsLogo}
                alt="Naga Parochial School seal"
                className="w-24 h-24 2xl:w-28 2xl:h-28"
                loading="eager"
              />
              <h2 className="font-serif font-bold text-[26px] md:text-[28px] 2xl:text-[32px] text-ink-primary mt-3 leading-tight">
                Naga Parochial School
              </h2>
              <div className="text-[12px] 2xl:text-[13px] uppercase tracking-[0.18em] font-semibold text-nps-red mt-1.5">
                Registrar System
              </div>
              <div className="w-10 2xl:w-12 h-[2px] bg-nps-red/30 mt-3" aria-hidden="true" />
            </div>

            <div className="mt-7 2xl:mt-9 flex flex-col gap-4 2xl:gap-5">
              {/* Email */}
              <div>
                <label
                  className="text-[12.5px] font-medium text-ink-primary block mb-1.5"
                  htmlFor="email"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="firstname.lastname@nps.edu.ph"
                    autoComplete="username"
                    className="pl-10 h-11 2xl:h-12 text-[13.5px] 2xl:text-[14.5px]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  className="text-[12.5px] font-medium text-ink-primary block mb-1.5"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className="pl-10 pr-11 h-11 2xl:h-12 text-[13.5px] 2xl:text-[14.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink-primary"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-[12.5px] text-nps-red font-medium" role="alert">
                  {error}
                </p>
              )}

              {/* Sign in */}
              <button
                type="submit"
                disabled={busy}
                className="group w-full h-12 2xl:h-[52px] mt-2 rounded-md bg-nps-red hover:bg-nps-red-dark text-white font-semibold text-[15px] 2xl:text-[16px] transition-colors shadow-md shadow-nps-red/25 flex items-center justify-center relative disabled:opacity-60"
              >
                <span>{busy ? 'Signing in…' : 'Sign in'}</span>
                <ArrowRight className="w-4 h-4 absolute right-5 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* "or" divider */}
              <div className="flex items-center gap-3 my-1 text-[11.5px] text-ink-muted">
                <div className="flex-1 h-px bg-border-soft" />
                <span>or</span>
                <div className="flex-1 h-px bg-border-soft" />
              </div>

              <p className="text-[12.5px] text-ink-secondary text-center">
                Forgot your password?{' '}
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-nps-red hover:text-nps-red-dark font-semibold"
                >
                  Contact the school admin.
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
