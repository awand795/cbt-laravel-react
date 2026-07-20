import { Link } from '@tanstack/react-router';
import { FaShieldAlt, FaRocket, FaChartLine, FaArrowRight } from 'react-icons/fa';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-blue-200">
      
      {/* Navigation */}
      <nav className="w-full px-6 py-4 sm:px-8 flex justify-between items-center max-w-7xl mx-auto absolute top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
            <span className="text-white text-sm font-bold">CBT</span>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-800">Sekolah Pro</span>
        </div>
        <Link 
          to="/login" 
          className="bg-white/90 backdrop-blur-md border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm"
        >
          Masuk Portal
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-16 lg:pt-48 lg:pb-32 px-4 sm:px-6 overflow-hidden flex flex-col items-center justify-center min-h-[85vh]">
        
        {/* Decorative Background Gradients */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-blue-400/20 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-indigo-400/20 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center mb-6 px-4 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-bold tracking-widest uppercase shadow-sm">
            Platform Ujian Digital #1
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
            Ujian Aman, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Tanpa Kecurangan.</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-normal px-4">
            Sistem Computer Based Test modern dengan teknologi Anti-Cheat tingkat tinggi. Deteksi perpindahan tab, mode fullscreen wajib, dan tangguh menghadapi kendala server.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-4">
            <Link 
              to="/login"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 sm:py-4 rounded-xl font-medium text-base sm:text-lg shadow-xl shadow-blue-600/30 transform transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <span>Mulai Ujian Sekarang</span>
              <FaArrowRight className="text-sm" />
            </Link>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl font-medium text-base sm:text-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-center"
            >
              Pelajari Fitur
            </a>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-24 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Fitur Unggulan</h2>
            <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto">Didesain khusus untuk menjaga integritas akademik sekaligus memberikan performa yang maksimal tanpa hambatan.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group flex flex-col items-center text-center md:items-start md:text-left">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                <FaShieldAlt className="text-2xl text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Keamanan Anti-Cheat</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Sistem otomatis membekukan ujian jika peserta mencoba membuka tab lain, aplikasi lain, atau keluar dari mode layar penuh.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group flex flex-col items-center text-center md:items-start md:text-left">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                <FaRocket className="text-2xl text-fuchsia-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Tangguh & Cepat</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Arsitektur frontend modern menjamin ujian tidak akan terputus. Jawaban Anda selalu dicadangkan ke memori lokal browser.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group flex flex-col items-center text-center md:items-start md:text-left sm:col-span-2 md:col-span-1">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                <FaChartLine className="text-2xl text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Analitik Realtime</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Pengawas memiliki kontrol penuh dengan dashboard interaktif. Pantau siapa yang sedang ujian atau terdeteksi curang seketika.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm bg-white border-t border-slate-100">
        &copy; {new Date().getFullYear()} CBT Sekolah Pro. Dibangun dengan Laravel & React.
      </footer>
    </div>
  );
}
