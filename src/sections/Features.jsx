import { useEffect, useRef } from 'react';
import {
  ScanFace,
  Calculator,
  Shield,
  Layout,
  Zap,
  Users
} from
  'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: ScanFace,
    title: 'Điểm danh thông minh',
    description: 'Nhận diện khuôn mặt thờigian thực dưới 200ms. Không cần thiết bị phụ trợ.',
    stats: '99.4% chính xác',
    color: 'violet'
  },
  {
    icon: Calculator,
    title: 'Quản lý điểm số',
    description: 'Tính toán và theo dõi GPA tự động với báo cáo học kỳ.',
    stats: 'Tự động tính',
    color: 'indigo'
  },
  {
    icon: Shield,
    title: 'Phân quyền theo vai trò',
    description: 'Quyền hạn chi tiết cho Quản trị viên, Giáo viên và Phụ huynh.',
    stats: '3 cấp độ',
    color: 'emerald'
  },
  {
    icon: Layout,
    title: 'Giao diện hiện đại',
    description: 'Giao diện đáp ứng, tương thích chủ đề và thân thiện với ngườidùng.',
    stats: 'Tối/Tối giản',
    color: 'blue'
  },
  {
    icon: Zap,
    title: 'Đồng bộ thờigian thực',
    description: 'Đồng bộ dữ liệu tức thì trên tất cả các thiết bị.',
    stats: '< 200ms độ trễ',
    color: 'amber'
  },
  {
    icon: Users,
    title: 'Cổng thông tin phụ huynh',
    description: 'Bảng điều khiển dành riêng cho phụ huynh theo dõi tiến độ học tập.',
    stats: 'Truy cập 24/7',
    color: 'rose'
  }];


const colorClasses = {
  violet: {
    bg: 'bg-violet/10',
    icon: 'text-violet-light',
    border: 'border-violet/20'
  },
  indigo: {
    bg: 'bg-indigo/10',
    icon: 'text-indigo-light',
    border: 'border-indigo/20'
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    icon: 'text-emerald-400',
    border: 'border-emerald-500/20'
  },
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-400',
    border: 'border-blue-500/20'
  },
  amber: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-400',
    border: 'border-amber-500/20'
  },
  rose: {
    bg: 'bg-rose-500/10',
    icon: 'text-rose-400',
    border: 'border-rose-500/20'
  }
};

export default function Features() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);
  const titleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      // Cards stagger animation
      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.fromTo(
            card,
            { y: 50, opacity: 0, rotate: -1 },
            {
              y: 0,
              opacity: 1,
              rotate: 0,
              duration: 0.6,
              delay: index * 0.1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          );
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative w-full py-20 lg:py-32 overflow-hidden"
      style={{ background: 'var(--public-features-bg)' }}>

      {/* Decorative Orbs */}
      <div className="orb orb-violet w-[30vw] h-[30vw] right-[5vw] top-[10vh] opacity-25" />
      <div className="orb orb-indigo w-[25vw] h-[25vw] left-[8vw] bottom-[15vh] opacity-20" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div ref={titleRef} className="text-center mb-16">
            <div className="eyebrow mb-4 justify-center flex">Tính năng</div>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
              style={{ color: 'var(--public-text-primary)' }}>
              Mọi thứ bạn cần để{' '}
              <span className="gradient-text">Quản lý trường học</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--public-text-body)' }}>
              Bộ công cụ hoàn chỉnh được thiết kế để hợp lý hóa hoạt động của trường học,
              từ theo dõi điểm danh đến quản lý điểm số và hơn thế nữa.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const colors = colorClasses[feature.color];
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  ref={(el) => { cardsRef.current[index] = el; }}
                  className="glass-card p-6 lg:p-8 group hover:scale-[1.02] transition-transform duration-300">

                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>

                    <Icon className={`w-7 h-7 ${colors.icon}`} />
                  </div>

                  {/* Content */}
                  <h3 className="font-heading text-xl font-semibold mb-3"
                    style={{ color: 'var(--public-text-primary)' }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--public-text-body)' }}>
                    {feature.description}
                  </p>

                  {/* Stats Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.icon.replace('text-', 'bg-')}`} />
                    <span className="text-xs font-medium text-slate-300">{feature.stats}</span>
                  </div>
                </div>);

            })}
          </div>
        </div>
      </div>
    </section>);

}