import { useState } from 'react';
import { FaSignInAlt, FaGoogle, FaEnvelope } from 'react-icons/fa';
import { Link } from '@tanstack/react-router';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Fungsi login sedang dibangun! Mengarah ke API Backend...');
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900">
      
      {/* Left Column */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 flex-col justify-center items-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 opacity-90 z-0"></div>
        <div className="absolute inset-0 z-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 40%)' }}></div>
        <div className="absolute w-[800px] h-[800px] border-[1px] border-white/20 rounded-full top-[-20%] left-[-20%] z-0"></div>
        <div className="absolute w-[600px] h-[600px] border-[1px] border-white/10 rounded-full bottom-[-10%] right-[-10%] z-0"></div>
        
        <div className="relative z-10 text-center max-w-lg">
          <Link to="/" className="text-white/80 hover:text-white flex items-center justify-center gap-2 mb-12 text-sm font-medium transition-colors">
            &larr; Kembali ke Beranda
          </Link>
          <h1 className="text-5xl font-bold text-white mb-6 tracking-tight leading-tight">Welcome Back</h1>
          <p className="text-xl text-blue-100 font-light leading-relaxed">
            Access your secure portal and manage your CBT examinations.
          </p>
        </div>
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-16 lg:p-24 bg-white relative">
        <div className="absolute top-8 right-8 flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">CBT</span>
          </div>
          <span className="font-bold text-slate-800 tracking-tight text-sm uppercase">Sekolah Pro</span>
        </div>

        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Sign In</h2>
            <p className="text-slate-500 text-sm">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block text-left">Email Address</label>
              <input 
                type="email" 
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder-slate-400 text-sm"
                placeholder="name@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <a href="#" className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">Forgot Password?</a>
              </div>
              <input 
                type="password" 
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder-slate-400 text-sm tracking-widest"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-lg shadow-blue-600/20 transform transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span className="text-sm">Sign In</span>
              <FaSignInAlt className="text-sm" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
