import { useEffect, useRef, useState } from 'react';
import api from '@/services/api';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart
} from
  'recharts';
import { TrendingUp, BarChart3, Target, ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const metrics = [
  {
    icon: TrendingUp,
    label: 'Tăng trưởng',
    value: '+12.5%',
    description: 'So với học kỳ trước',
    color: 'emerald'
  },
  {
    icon: Target,
    label: 'Xu hướng',
    value: 'Cải thiện',
    description: 'Đà tăng ổn định',
    color: 'blue'
  },
  {
    icon: BarChart3,
    label: 'Điểm trung bình',
    value: '7.8',
    description: 'Toàn trường',
    color: 'violet'
  }];


const colorMap = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20'
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20'
  },
  violet: {
    bg: 'bg-violet/10',
    text: 'text-violet-light',
    border: 'border-violet/20'
  }
};

const FALLBACK_DATA = [
  { subject: 'Toán', HK1: 8.5, HK2: 9.0, trend: 8.75 },
  { subject: 'Văn', HK1: 7.5, HK2: 8.2, trend: 7.85 },
  { subject: 'Anh', HK1: 8.0, HK2: 8.5, trend: 8.25 },
  { subject: 'Vật Lý', HK1: 7.8, HK2: 8.4, trend: 8.1 },
  { subject: 'Hóa Học', HK1: 7.2, HK2: 8.0, trend: 7.6 },
  { subject: 'Sinh Học', HK1: 8.8, HK2: 9.2, trend: 9.0 }
];

export default function Analytics() {
  const sectionRef = useRef(null);
  const chartRef = useRef(null);
  const contentRef = useRef(null);
  const metricsRef = useRef(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/grades');
        const data = res.data;
        if (data && Array.isArray(data) && data.length > 0) {
          setChartData(data);
        } else {
          setChartData(FALLBACK_DATA);
        }
      } catch (err) {
        setChartData(FALLBACK_DATA);
      }
    };
    fetchAnalytics();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { x: -50, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      gsap.fromTo(
        chartRef.current,
        { x: 50, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          delay: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      gsap.fromTo(
        metricsRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          delay: 0.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="analytics"
      ref={sectionRef}
      className="relative w-full py-20 lg:py-32 overflow-hidden"
      style={{ background: 'var(--public-analytics-bg)' }}>

      {/* Decorative Orbs */}
      <div className="orb orb-indigo w-[35vw] h-[35vw] left-[-10vw] top-[20vh] opacity-25" />
      <div className="orb orb-violet w-[28vw] h-[28vw] right-[5vw] bottom-[10vh] opacity-20" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left Content */}
            <div ref={contentRef}>
              <div className="eyebrow mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Phân tích</span>
              </div>

              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
                style={{ color: 'var(--public-text-primary)' }}>
                Thông tin chi tiết để đưa ra{' '}
                <span className="gradient-text block lg:inline-block">Quyết định</span>
              </h2>

              <p className="text-lg leading-relaxed mb-8" style={{ color: 'var(--public-text-body)' }}>
                Từ thành tích lớp học đến sự phát triển cá nhân—trực quan hóa những gì quan trọng, ngay lập tức.
                Bảng điều khiển phân tích của chúng tôi cung cấp thông tin chi tiết thờigian thực về tiến độ học tập
                và xu hướng toàn trường.
              </p>

              {/* Metrics */}
              <div ref={metricsRef} className="space-y-4">
                {metrics.map((metric) => {
                  const colors = colorMap[metric.color];
                  const Icon = metric.icon;

                  return (
                    <div
                      key={metric.label}
                      className={`glass-card p-4 flex items-center gap-4 hover:scale-[1.01] transition-transform`}>

                      <div
                        className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>

                        <Icon className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-400">{metric.label}</p>
                        <p className={`text-xl font-bold ${colors.text}`}>{metric.value}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{metric.description}</p>
                      </div>
                      <ArrowUpRight className={`w-5 h-5 ${colors.text} opacity-50`} />
                    </div>);

                })}
              </div>
            </div>

            {/* Right Chart Card */}
            <div ref={chartRef} className="glass-card p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-white">
                    Kết quả học tập
                  </h3>
                  <p className="text-sm text-slate-400">So sánh HK1 vs HK2</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet" />
                    <span className="text-xs text-slate-400">HK1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo" />
                    <span className="text-xs text-slate-400">HK2</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-[350px] lg:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.1)"
                      vertical={false} />

                    <XAxis
                      dataKey="subject"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12 }} />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      domain={[0, 10]} />

                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '12px',
                        padding: '12px'
                      }}
                      labelStyle={{ color: '#F8FAFC', fontWeight: 600 }}
                      itemStyle={{ color: '#94A3B8' }} />

                    <Bar
                      dataKey="HK1"
                      fill="#7C3AED"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40} />

                    <Bar
                      dataKey="HK2"
                      fill="#4F46E5"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40} />

                    <Line
                      type="monotone"
                      dataKey="trend"
                      stroke="#A78BFA"
                      strokeWidth={2}
                      dot={{ fill: '#A78BFA', strokeWidth: 0, r: 4 }}
                      strokeDasharray="5 5" />

                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Footer */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Cập nhật: <span className="text-slate-300">Hôm nay, 08:30</span>
                </p>
                <button className="text-sm text-violet-light hover:text-violet flex items-center gap-1 transition-colors">
                  Xem chi tiết
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);

}
