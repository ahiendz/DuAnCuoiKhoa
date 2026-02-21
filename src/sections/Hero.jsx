import { useEffect, useRef } from 'react';
import { ArrowRight, ScanFace, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

export default function Hero() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const leftCardRef = useRef(null);
  const rightCardRef = useRef(null);
  const headlineRef = useRef(null);
  const subheadlineRef = useRef(null);
  const ctaRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set([leftCardRef.current, rightCardRef.current], { opacity: 0 });
      gsap.set(leftCardRef.current, { x: '-60vw', rotate: -2 });
      gsap.set(rightCardRef.current, { x: '60vw', rotate: 2 });
      gsap.set(headlineRef.current, { y: 24, opacity: 0 });
      gsap.set(subheadlineRef.current, { y: 20, opacity: 0 });
      gsap.set(ctaRef.current, { scale: 0.92, opacity: 0 });
      gsap.set([orb1Ref.current, orb2Ref.current], { opacity: 0, scale: 0.92 });

      // Animation timeline
      const tl = gsap.timeline({ delay: 0.2 });

      tl.to([orb1Ref.current, orb2Ref.current], {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: 'power2.out'
      }).
        to(
          leftCardRef.current,
          {
            x: 0,
            opacity: 1,
            rotate: 0,
            duration: 0.9,
            ease: 'power3.out'
          },
          '-=0.8'
        ).
        to(
          rightCardRef.current,
          {
            x: 0,
            opacity: 1,
            rotate: 0,
            duration: 0.9,
            ease: 'power3.out'
          },
          '-=0.75'
        ).
        to(
          headlineRef.current,
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out'
          },
          '-=0.5'
        ).
        to(
          subheadlineRef.current,
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
          },
          '-=0.3'
        ).
        to(
          ctaRef.current,
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
          },
          '-=0.2'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleAttendanceClick = () => {
    navigate('/attendance');
  };

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-16"
      style={{ background: 'linear-gradient(180deg, #0B1120 0%, #151D2E 100%)' }}>

      {/* Grid Lines */}
      <div className="grid-lines opacity-30" />

      {/* Decorative Orbs */}
      <div
        ref={orb1Ref}
        className="orb orb-violet w-[42vw] h-[42vw] -left-[10vw] -top-[10vh] opacity-35" />

      <div
        ref={orb2Ref}
        className="orb orb-indigo w-[38vw] h-[38vw] -right-[8vw] -bottom-[12vh] opacity-30" />



      {/* Content Container */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
          {/* Left Media Card */}
          <div
            ref={leftCardRef}
            className="glass-card aspect-[4/3] lg:aspect-auto lg:h-[500px] xl:h-[550px] overflow-hidden order-2 lg:order-1">

            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-300">Trực tiếp</span>
              </div>
            </div>
            <img
              src="/img/hero.png"
              alt="Giáo dục AI"
              className="w-full h-full object-cover" />

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" />

            {/* Floating stats card */}
            <div className="absolute bottom-4 left-4 right-4 glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-violet-light" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Hiệu suất</p>
                  <p className="text-sm font-semibold text-white">+94.2%</p>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo/20 flex items-center justify-center">
                  <ScanFace className="w-5 h-5 text-indigo-light" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Độ chính xác</p>
                  <p className="text-sm font-semibold text-white">99.4%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content Card */}
          <div
            ref={rightCardRef}
            className="glass-card p-6 sm:p-8 lg:p-10 order-1 lg:order-2">

            <div className="eyebrow mb-4 flex items-center gap-2">
              <ScanFace className="w-4 h-4" />
              <span>Điểm danh AI</span>
            </div>

            <h1
              ref={headlineRef}
              className="font-heading text-3xl sm:text-4xl lg:text-5xl xl:text-[56px] font-bold text-white leading-tight mb-6">

              Cách mạng hóa giáo dục bằng{' '}
              <span className="gradient-text block lg:inline-block">Trí tuệ nhân tạo</span>
            </h1>

            <p
              ref={subheadlineRef}
              className="text-base lg:text-lg text-slate-300 leading-relaxed mb-8">

              Tích hợp liền mạch điểm danh, phân tích và quản lý—được xây dựng cho các trường học hiện đại.
              Trải nghiệm tương lai của giáo dục với nhận diện khuôn mặt thờigian thực và thông tin chi tiết thông minh.
            </p>

            <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleAttendanceClick} className="btn-primary gap-2">
                <ScanFace className="w-5 h-5" />
                <span>Điểm danh AI</span>
              </button>
              <a
                href="#analytics"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('analytics')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-secondary gap-2">

                <span>Xem bảng điều khiển</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy to-transparent pointer-events-none" />
    </section>);

}