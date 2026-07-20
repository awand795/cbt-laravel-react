import { Link } from '@tanstack/react-router';
import { FaShieldAlt, FaRocket, FaChartLine, FaArrowRight } from 'react-icons/fa';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Navigation */}
      <nav className="w-full px-8 py-6 flex justify-between items-center max-w-7xl mx-auto absolute top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
            <span className="text-white text-sm font-bold">CBT</span>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-800">Sekolah Pro</span>
        </div>
        <Link 
          to="/login" 
          className="bg-white/80 backdrop-blur-md border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm"
        >
          Masuk Portal
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -mr-48 -mt-48 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold tracking-wider uppercase">
            Platform Ujian Digital #1
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
            Ujian Aman,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Tanpa Kecurangan.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Sistem Computer Based Test modern dengan teknologi Anti-Cheat tingkat tinggi. Deteksi perpindahan tab, mode fullscreen wajib, dan tangguh menghadapi kendala server.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/login"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium text-lg shadow-xl shadow-blue-600/30 transform transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <span>Mulai Ujian Sekarang</span>
              <FaArrowRight className="text-sm" />
            </Link>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-medium text-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Pelajari Fitur
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Fitur Unggulan</h2>
            <p className="text-slate-500">Didesain khusus untuk integritas akademik dan performa maksimal.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 mb-6 group-hover:scale-110 transition-transform">
                <FaShieldAlt className="text-2xl text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Keamanan Anti-Cheat</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Sistem akan membekukan ujian jika peserta terdeteksi berpindah tab, menutup mode layar penuh, atau menekan tombol tertentu.
              </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 mb-6 group-hover:scale-110 transition-transform">
                <FaRocket className="text-2xl text-fuchsia-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Tangguh & Cepat</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Arsitektur terpisah (Headless) menjamin web super responsif. Jawaban disimpan lokal agar aman dari kendala putus koneksi internet.
              </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 mb-6 group-hover:scale-110 transition-transform">
                <FaChartLine className="text-2xl text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Analitik Realtime</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Pengawas dapat memonitor progres seluruh siswa, melihat siapa yang sedang ujian, selesai, atau terblokir secara langsung.
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
