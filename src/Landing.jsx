import React from 'react';
import { SignInButton } from '@clerk/clerk-react';
import { CalendarDays, ShieldCheck, Zap, BarChart3, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#020817] text-slate-200 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Navbar Minimalista */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <CalendarDays size={24} />
          </div>
          <span className="text-xl font-black text-white uppercase italic tracking-wider">
            Smart Calendar
          </span>
        </div>
        <SignInButton mode="modal">
          <button className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Iniciar Sesión
          </button>
        </SignInButton>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative px-6 w-full max-w-7xl mx-auto z-10 -mt-10">
        
        {/* Gradients Ambientales (Fondo) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="text-center max-w-3xl space-y-8 relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-sm mb-4">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Gestión de reservas de nueva generación
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
            Simplifica tu agenda, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              multiplica tu tiempo.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Un motor de reservas inteligente y dinámico construido sobre Airtable. 
            Sincronización en tiempo real, precios automatizados y control absoluto de tu operación.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignInButton mode="modal">
              <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_60px_rgba(37,99,235,0.5)] transition-all active:scale-95 flex items-center justify-center gap-3 group">
                <ShieldCheck size={22} className="group-hover:scale-110 transition-transform" /> 
                Acceso al Sistema
              </button>
            </SignInButton>
          </div>

          <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
             <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm">
                <Zap size={24} className="text-blue-400 mb-4" />
                <h3 className="text-white font-bold mb-2">Sincronización Total</h3>
                <p className="text-sm text-slate-400">Integración en tiempo real con Master, Recepción y Bots.</p>
             </div>
             <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm">
                <BarChart3 size={24} className="text-indigo-400 mb-4" />
                <h3 className="text-white font-bold mb-2">Tarifas Inteligentes</h3>
                <p className="text-sm text-slate-400">Cálculo dinámico basado en reglas JSON o costos por hora.</p>
             </div>
             <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm">
                <CheckCircle2 size={24} className="text-emerald-400 mb-4" />
                <h3 className="text-white font-bold mb-2">Prevención de Choques</h3>
                <p className="text-sm text-slate-400">Asegura la disponibilidad exacta de tu flota y evita dobles reservas.</p>
             </div>
          </div>
        </div>
      </main>

      {/* Footer minimalista */}
      <footer className="w-full border-t border-slate-800/50 py-8 relative z-10 bg-[#020817]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} Smart Calendar. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Powered By</span>
            <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 uppercase tracking-widest italic drop-shadow-sm">
              Forward Analytics
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
