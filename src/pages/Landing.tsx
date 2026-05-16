import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#081a66] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,209,51,0.12),_transparent_36%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_30%),linear-gradient(180deg,_#081a66_0%,_#07124b_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:90px_90px] opacity-10" />
      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#ffd233]/10 blur-3xl" />
      <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white/8 blur-3xl" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] items-center justify-center px-6 py-14 sm:px-10 lg:px-16">
        <section className="flex w-full max-w-4xl flex-col items-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.5em] text-white/65 sm:text-base">
            Welcome to the 
          </p>

          <h1 className="mt-4 max-w-5xl text-[clamp(2.8rem,8vw,5.4rem)] font-black italic leading-[0.9] tracking-[-0.05em] text-[#ffd233] drop-shadow-[0_8px_24px_rgba(0,0,0,0.22)] sm:leading-[0.86]">
            COURSE MANAGEMENT SYSTEM
       
            
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            A centralized administrative portal for curriculum oversight and institutional operations.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-12 inline-flex h-14 items-center justify-center gap-3 rounded-[1.25rem] bg-[#ffd233] px-9 text-sm font-black tracking-[0.3em] text-[#081a66] shadow-[0_18px_50px_rgba(255,210,51,0.22)] transition-transform duration-200 hover:scale-[1.03] sm:h-16"
          >
            ENTER SYSTEM
            <ArrowRight className="h-5 w-5" />
          </button>

          <p className="mt-20 text-[0.7rem] font-black uppercase tracking-[0.55em] text-white/25 sm:text-xs">
            Course Management System
          </p>
        </section>
      </main>
    </div>
  )
}

export default Landing
