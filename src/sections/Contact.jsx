import { useEffect, useRef } from 'react';
import { Mail, Phone, MessageCircle, ArrowUpRight, Clock, MapPin } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

const contactMethods = [
  {
    icon: Mail,
    title: 'Email',
    value: 'support@schoolmanager.vn',
    description: 'Phản hồi trong 24h',
    action: 'Gửi email',
    href: 'mailto:support@schoolmanager.vn',
    color: 'violet'
  },
  {
    icon: Phone,
    title: 'Hotline',
    value: '1900-123-456',
    description: '7:00 - 21:00, T2-CN',
    action: 'Gọi ngay',
    href: 'tel:1900123456',
    color: 'indigo'
  },
  {
    icon: MessageCircle,
    title: 'Live Chat',
    value: 'Trong ứng dụng',
    description: 'Hỗ trợ tức thì',
    action: 'Bắt đầu chat',
    href: '/support',
    color: 'emerald'
  }];


const colorMap = {
  violet: {
    bg: 'bg-violet/10',
    icon: 'text-violet-light',
    border: 'border-violet/20',
    hover: 'hover:bg-violet/20'
  },
  indigo: {
    bg: 'bg-indigo/10',
    icon: 'text-indigo-light',
    border: 'border-indigo/20',
    hover: 'hover:bg-indigo/20'
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    icon: 'text-emerald-400',
    border: 'border-emerald-500/20',
    hover: 'hover:bg-emerald-500/20'
  }
};

export default function Contact() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef([]);
  const infoRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        headerRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      // Cards stagger animation
      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.fromTo(
            card,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              delay: index * 0.15,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 65%',
                toggleActions: 'play none none reverse'
              }
            }
          );
        }
      });

      // Info section animation
      gsap.fromTo(
        infoRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          delay: 0.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 55%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative w-full py-20 lg:py-32 overflow-hidden"
      style={{ background: 'var(--public-contact-bg)' }}>

      {/* Decorative Orbs */}
      <div className="orb orb-violet w-[32vw] h-[32vw] right-[-8vw] top-[15vh] opacity-25" />
      <div className="orb orb-indigo w-[28vw] h-[28vw] left-[5vw] bottom-[10vh] opacity-20" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div ref={headerRef} className="text-center mb-16">
            <div className="eyebrow mb-4 justify-center flex">Liên hệ</div>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
              style={{ color: 'var(--public-text-primary)' }}>
              Chúng tôi luôn sẵn sàng <span className="gradient-text">Hỗ trợ</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--public-text-body)' }}>
              Liên hệ để được hỗ trợ tích hợp, đào tạo hoặc hỗ trợ kỹ thuật—phản hồi nhanh, luôn luôn.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {contactMethods.map((method, index) => {
              const colors = colorMap[method.color];
              const Icon = method.icon;

              return (
                <div
                  key={method.title}
                  ref={(el) => { cardsRef.current[index] = el; }}
                  className="glass-card p-6 lg:p-8 group hover:scale-[1.02] transition-all duration-300">

                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>

                    <Icon className={`w-7 h-7 ${colors.icon}`} />
                  </div>

                  {/* Content */}
                  <h3 className="font-heading text-xl font-semibold text-white mb-2">
                    {method.title}
                  </h3>
                  <p className="text-lg font-medium text-slate-200 mb-1">{method.value}</p>
                  <p className="text-sm text-slate-400 mb-6">{method.description}</p>

                  {/* Action Button */}
                  {method.href.startsWith('/') ? (
                    <Link
                      to={method.href}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${colors.bg} border ${colors.border} ${colors.hover} transition-colors text-sm font-medium ${colors.icon}`}>
                      {method.action}
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <a
                      href={method.href}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${colors.bg} border ${colors.border} ${colors.hover} transition-colors text-sm font-medium ${colors.icon}`}>
                      {method.action}
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  )}
                </div>);

            })}
          </div>

          {/* Additional Info */}
          <div
            ref={infoRef}
            className="glass-card p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-violet-light" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Giờ làm việc</p>
                <p className="text-white font-medium">Thứ 2 - Chủ nhật: 7:00 - 21:00</p>
              </div>
            </div>

            <div className="h-px w-full sm:w-px sm:h-12 bg-white/10" />

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo/10 border border-indigo/20 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-indigo-light" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Trụ sở</p>
                <p className="text-white font-medium">TP. Hồ Chí Minh, Việt Nam</p>
              </div>
            </div>

            <div className="h-px w-full sm:w-px sm:h-12 bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) =>
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-indigo border-2 border-navy flex items-center justify-center">

                    <span className="text-xs font-medium text-white">{i}</span>
                  </div>
                )}
              </div>
              <div className="text-sm">
                <p className="text-slate-400">Đội ngũ hỗ trợ</p>
                <p className="text-white font-medium">50+ chuyên gia</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);

}