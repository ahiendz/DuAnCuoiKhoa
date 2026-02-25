import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ScanFace, LogIn } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { name: 'Trang chủ', href: '#home' },
  { name: 'Tính năng', href: '#features' },
  { name: 'Phân tích', href: '#analytics' },
  { name: 'Liên hệ', href: '#contact' }
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    const targetId = href.replace('#', '');

    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  const handleAttendanceClick = () => {
    navigate('/attendance');
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ease-in-out ${isScrolled
          ? 'backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] py-1'
          : 'bg-transparent border-b border-transparent py-2'
          }`}
        style={isScrolled ? {
          background: 'var(--public-nav-scrolled-bg)',
          borderBottom: '1px solid var(--public-nav-border)'
        } : {}}>

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-20 lg:h-24">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo/img.svg"
                alt="School Manager Pro"
                className="h-16 lg:h-20 w-auto object-contain transition-all duration-300 group-hover:scale-110"
              />
              <div className="flex flex-col">
                <span className="text-xl lg:text-2xl font-bold font-heading tracking-tight leading-tight whitespace-nowrap"
                  style={{ color: 'var(--public-nav-text)' }}>
                  School Manager <span className="gradient-text">Pro</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold"
                  style={{ color: 'var(--glass-text-muted)' }}>Smart Education System</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) =>
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-sm font-medium transition-colors relative group"
                  style={{ color: 'var(--public-nav-text)' }}>

                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-violet transition-all duration-300 group-hover:w-full" />
                </a>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />

              <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
                style={{ color: 'var(--public-nav-text)' }}>
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </Link>

              <button
                onClick={handleAttendanceClick}
                className="btn-primary gap-2 px-5 py-2">
                <ScanFace className="w-4 h-4" />
                <span>Điểm danh AI</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`
        }>

        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          className="absolute inset-0 bg-navy/95 backdrop-blur-xl"
          onClick={() => setIsMobileMenuOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsMobileMenuOpen(false); }}
        />
        <div className="absolute top-24 left-0 right-0 p-6">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) =>
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-lg font-medium text-slate-300 hover:text-white transition-colors py-2">

                {link.name}
              </a>
            )}
            <Link to="/login" className="flex items-center justify-center gap-2 w-full py-3 mt-4 mb-2 rounded-xl border border-white/20 text-slate-200 hover:bg-white/10 transition-colors font-medium">
              <LogIn className="w-5 h-5" />
              <span>Đăng nhập</span>
            </Link>
            <button
              onClick={handleAttendanceClick}
              className="btn-primary gap-2 w-full py-3">
              <ScanFace className="w-5 h-5" />
              <span>Điểm danh AI</span>
            </button>
          </div>
        </div>
      </div>
    </>);

}


