import { GraduationCap, Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const footerLinks = {
  product: [
    { name: 'Tính năng', href: '#features' },
    { name: 'Phân tích', href: '#analytics' },
    { name: 'Bảng giá', href: '#' },
    { name: 'Cập nhật', href: '#' }],

  company: [
    { name: 'Giới thiệu', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Tuyển dụng', href: '#' },
    { name: 'Liên hệ', href: '#contact' }],

  legal: [
    { name: 'Quyền riêng tư', href: '#' },
    { name: 'Điều khoản', href: '#' },
    { name: 'Bảo mật', href: '#' }]

};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Mail, href: 'mailto:support@schoolmanager.vn', label: 'Email' }];


export default function Footer() {
  const handleNavClick = (e, href) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="relative w-full py-16 lg:py-20 overflow-hidden"
      style={{ background: 'var(--public-footer-bg)' }}>
      {/* Top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-4 lg:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet to-indigo flex items-center justify-center shadow-glow">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-heading font-bold text-xl text-white">
                  School Manager Pro
                </span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
                Cách mạng hóa giáo dục thông qua trí tuệ nhân tạo.
                Tích hợp liền mạch điểm danh, phân tích và quản lý cho các trường học hiện đại.
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      aria-label={social.label}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all">

                      <Icon className="w-5 h-5" />
                    </a>);

                })}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Sản phẩm</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) =>
                  <li key={link.name}>
                    <a
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="text-sm text-slate-400 hover:text-white transition-colors">

                      {link.name}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Công ty</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) =>
                  <li key={link.name}>
                    <a
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="text-sm text-slate-400 hover:text-white transition-colors">

                      {link.name}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Pháp lý</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) =>
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors">

                      {link.name}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} School Manager Pro. Mọi quyền được bảo lưu.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-sm text-slate-500">
                Được tạo với ❤️ tại Việt Nam
              </span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-slate-400">Hệ thống hoạt động</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>);

}