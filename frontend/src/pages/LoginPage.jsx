import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Common/Logo';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light-cream to-soft-white p-5 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute w-[500px] h-[500px] bg-radial from-orange/5 to-transparent -top-[100px] -right-[100px] rounded-full"></div>
      <div className="absolute w-[400px] h-[400px] bg-radial from-info-analytics/5 to-transparent -bottom-[80px] -left-[80px] rounded-full"></div>
      
      <div className="w-full max-w-md p-10 bg-pure-white border border-soft-gray rounded-2xl shadow-lg relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-light-cream border border-soft-gray flex items-center justify-center p-2 shadow-inner">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-deep-navy mb-1">Login</h1>
          <p className="text-sm text-slate-gray">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="bg-red-give/10 border border-red-give/20 rounded-lg p-3.5 mb-4 text-red-give text-sm text-center font-medium animate-pulse">
            {error}
          </div>
        )}
        
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input 
              id="email"
              name="email"
              className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all"
              type="email" 
              placeholder="you@example.com" 
              required
              value={form.email} 
              onChange={(e) => setForm({...form, email: e.target.value})} 
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input 
                id="password"
                name="password"
                className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all pr-12"
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                required
                value={form.password} 
                onChange={(e) => setForm({...form, password: e.target.value})} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-gray cursor-pointer p-1 flex items-center justify-center hover:text-deep-navy transition-colors"
              >
                {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <Link to="/forgot-password" className="text-xs font-semibold text-orange hover:underline">
                Forgot Password?
              </Link>
            </div>
          </div>
          <button 
            className="w-full py-3.5 px-6 font-semibold text-sm rounded-lg bg-orange text-pure-white hover:bg-orange-hover transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            type="submit" 
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="text-center mt-6 text-sm text-slate-gray">
          Don't have an account? <Link to="/register" className="text-orange font-semibold hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
