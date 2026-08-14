import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { useLoginMutation, useRegisterMutation } from '../store/api/authApi';
import { setCredentials } from '../store/slices/authSlice';
import { useAppDispatch } from '../store/hooks';
import toast from 'react-hot-toast';

interface AuthPageProps {
  mode: 'login' | 'register';
}

const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let response;

      if (mode === 'login') {
        response = await login({
          email: formData.email,
          password: formData.password,
        }).unwrap();
      } else {
        response = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
        }).unwrap();
      }

      if (response.success && response.data) {
        dispatch(setCredentials({
          user: response.data.user,
          token: response.data.token,
        }));
        toast.success(response.message);

        // Redirect based on role
        if (response.data.user.role === 'admin') {
          navigate('/admin');
        } else if (response.data.user.role === 'restaurant') {
          navigate('/restaurant-dashboard');
        } else if (response.data.user.role === 'delivery') {
          navigate('/delivery-dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (error: any) {
      toast.error(error.data?.message || 'Something went wrong');
    }
  };

  const isLoading = isLoginLoading || isRegisterLoading;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2 mb-6">
              <span className="text-4xl">🍔</span>
              <span className="text-2xl font-bold gradient-text">HalkaBite</span>
            </Link>
            <h1 className="text-2xl font-bold mb-2">
              {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
            </h1>
            <p className="text-white/60">
              {mode === 'login'
                ? 'Sign in to continue ordering'
                : 'Join us and start ordering delicious food'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input pl-12"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                className="input pl-12"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input pl-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {mode === 'register' && (
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number (01XXXXXXXXX)"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input pl-12"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-4 text-lg"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/40 text-sm">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Social Login */}
          <button className="w-full py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-center gap-3">
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>

          {/* Switch Mode */}
          <p className="text-center mt-6 text-white/60">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                  Sign In
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
