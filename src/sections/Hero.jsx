import React, { lazy, Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ScanFace, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Lazy-load Spline — stays OUT of initial bundle ──────────────────────────
const Spline = lazy(() => import('@splinetool/react-spline'));

// ─── Hook: MediaQueryList-based (no memory leak) ──────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// ─── Skeleton placeholder while Spline loads ─────────────────────────────────
function SplineSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden">
      <div className="w-full h-full animate-pulse"
        style={{ background: 'rgba(124,58,237,0.06)' }} />
      <div className="absolute w-28 h-28 rounded-full border border-violet-500/20 animate-ping"
        style={{ animationDuration: '2s' }} />
    </div>
  );
}

// ─── Framer Motion variants ───────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.55, ease: 'easeOut' } }
};

// ─── Hero Component ───────────────────────────────────────────────────────────
export default function Hero() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <section
      id="home"
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-[var(--nav-height)]"
      style={{ background: 'var(--public-hero-bg)' }}
    >
      {/* Background: subtle grid */}
      <div className="grid-lines opacity-20" />

      {/* Background: ambient orbs */}
      <div className="orb orb-violet w-[50vw] h-[50vw] -left-[14vw] -top-[12vh] opacity-25 pointer-events-none" />
      <div className="orb orb-indigo w-[42vw] h-[42vw] -right-[10vw] -bottom-[14vh] opacity-20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-16 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">

          {/* ═══════════════ LEFT — Spline Robot (FIXED, NO MOVEMENT) ════════ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex justify-center items-center order-2 lg:order-1"
          >
            {/* Single subtle glow — CSS only, no canvas */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(124,58,237,0.32) 0%, rgba(79,70,229,0.12) 55%, transparent 75%)',
                filter: 'blur(90px)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 0
              }}
            />

            {/* Fixed-height container: prevents CLS, never moves */}
            <div
              className="relative w-full"
              style={{ height: isMobile ? '320px' : '550px', zIndex: 1 }}
            >
              {/* Slow idle float — applied ONLY to inner div, not the column */}
              <motion.div
                className="w-full h-full"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Suspense fallback={<SplineSkeleton />}>
                  <Spline
                    scene="https://prod.spline.design/2-JQHJ5RxxDxWW6Q/scene.splinecode"
                    style={{ width: '100%', height: '100%' }}
                  />
                </Suspense>
              </motion.div>
            </div>
          </motion.div>

          {/* ═══════════════ RIGHT — Text Content ════════════════════════════ */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="relative z-10 flex flex-col space-y-6 order-1 lg:order-2"
          >
            {/* Badge */}
            <motion.div variants={fadeUp}>
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
                style={{
                  background: 'rgba(124,58,237,0.14)',
                  border: '1px solid rgba(124,58,237,0.32)',
                  color: '#A78BFA'
                }}
              >
                <Zap className="w-3.5 h-3.5" />
                Hệ thống điểm danh AI
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="font-heading font-bold leading-[1.08] tracking-tight"
              style={{
                fontSize: 'clamp(2.1rem, 4.2vw, 3.6rem)',
                color: 'var(--public-text-primary)'
              }}
            >
              Cách mạng hóa<br />
              giáo dục bằng{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #c084fc 0%, #a78bfa 40%, #818cf8 75%, #6366f1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Trí tuệ nhân tạo
              </span>
            </motion.h1>

            {/* Paragraph */}
            <motion.p
              variants={fadeIn}
              className="text-base lg:text-lg leading-relaxed max-w-lg"
              style={{ color: 'var(--public-text-body)' }}
            >
              Tích hợp liền mạch điểm danh, phân tích và quản lý — được xây dựng cho các trường học hiện đại.
              Nhận diện khuôn mặt thời gian thực với thông tin chi tiết thông minh.
            </motion.p>

            {/* Stats row */}
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-6 pt-1"
            >
              {[
                { value: '500+', label: 'Trường học' },
                { value: '99.4%', label: 'Chính xác AI' },
                { value: '<1s', label: 'Nhận diện' },
              ].map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && (
                    <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
                  )}
                  <div>
                    <p className="text-xl font-bold" style={{ color: 'var(--public-text-primary)' }}>
                      {stat.value}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--public-text-body)' }}>
                      {stat.label}
                    </p>
                  </div>
                </React.Fragment>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 pt-2">
              {/* Primary */}
              <button
                onClick={() => navigate('/attendance')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #4F46E5 100%)',
                  boxShadow: '0 4px 24px rgba(124,58,237,0.38)'
                }}
              >
                <ScanFace className="w-5 h-5" />
                Trải nghiệm ngay
              </button>

              {/* Secondary */}
              <button
                type="button"
                onClick={() => document.getElementById('analytics')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--public-text-body, #CBD5E1)'
                }}
              >
                Xem Demo
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--public-hero-bg), transparent)' }}
      />
    </section>
  );
}