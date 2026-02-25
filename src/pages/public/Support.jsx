import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Mail, Loader2, CheckCircle, X } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { useNotifications } from '@/context/NotificationContext';

export default function Support() {
    const { addNotification } = useNotifications();

    // --- AI Chat State ---
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem('smp_ai_chat');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load chat history', e);
        }
        return [{ role: 'model', text: 'Xin chào! Tôi là trợ lý ảo của School Manager Pro. Tôi có thể giúp gì cho bạn hôm nay?' }];
    });
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    // --- EmailJS Form State ---
    const formRef = useRef();
    const [isSending, setIsSending] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    // Scroll chat to bottom safely without affecting viewport
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.style.scrollBehavior = 'smooth';
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

    // Persist chat to local storage
    useEffect(() => {
        localStorage.setItem('smp_ai_chat', JSON.stringify(messages));
    }, [messages]);

    // --- Handlers ---
    const handleClearChat = () => {
        const initial = [{ role: 'model', text: 'Xin chào! Tôi là trợ lý ảo của School Manager Pro. Tôi có thể giúp gì cho bạn hôm nay?' }];
        setMessages(initial);
        localStorage.setItem('smp_ai_chat', JSON.stringify(initial));
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsTyping(true);

        const token = localStorage.getItem('token');
        if (!token) {
            setMessages(prev => [...prev, { role: 'model', text: 'Vui lòng đăng nhập hệ thống để sử dụng tính năng Trợ lý ảo AI.' }]);
            setIsTyping(false);
            return;
        }

        try {
            const validHistoryToSubmit = messages
                .filter(m => m.role !== 'system' && !(m.role === 'model' && m.text?.includes('Xin chào! Tôi là trợ lý ảo')))
                .map(m => ({ role: m.role, parts: [{ text: m.text || (m.points ? m.points.join('\n') : '') }] }));

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: userMsg, history: validHistoryToSubmit })
            });

            if (response.status === 401 || response.status === 403) throw new Error('Phiên đăng nhập đã hết hạn.');
            if (!response.ok) throw new Error('Không thể kết nối đến AI');

            const data = await response.json();
            const newMessage = { role: 'model' };
            if (data.points && Array.isArray(data.points)) newMessage.points = data.points;
            else newMessage.text = data.text || 'Không có dữ liệu phản hồi';
            setMessages(prev => [...prev, newMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'model', text: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng sử dụng biểu mẫu bên cạnh để liên hệ quản trị viên.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (isSending) return;
        setIsSending(true);
        try {
            await emailjs.sendForm(
                import.meta.env.VITE_EMAILJS_SERVICE_ID,
                import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                formRef.current,
                import.meta.env.VITE_EMAILJS_PUBLIC_KEY
            );
            setShowSuccessDialog(true);
            setTimeout(() => setShowSuccessDialog(false), 5000);
            formRef.current.reset();
        } catch (error) {
            console.error('Email error:', error);
            addNotification('Không thể gửi tin nhắn. Vui lòng thử lại sau.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    /* ─────────────────────── RENDER ─────────────────────── */
    return (
        <div className="flex-1 w-full flex flex-col transition-colors duration-300"
            style={{ background: 'var(--public-hero-bg)' }}>

            <div className="relative pb-12 px-4 sm:px-6 lg:px-8 pt-24 lg:pt-28">

                {/* Background Orbs */}
                <div className="absolute top-0 left-[-10vw] w-[40vw] h-[40vw] blur-[120px] rounded-full pointer-events-none"
                    style={{ background: 'var(--icon-bg-violet)', opacity: 'var(--orb-opacity)' }} />
                <div className="absolute bottom-[-10vw] right-[-10vw] w-[40vw] h-[40vw] blur-[120px] rounded-full pointer-events-none"
                    style={{ background: 'var(--icon-bg-indigo)', opacity: 'var(--orb-opacity)' }} />

                <div className="max-w-7xl mx-auto relative z-10">

                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight"
                            style={{ color: 'var(--public-text-primary)' }}>
                            Trung tâm <span className="gradient-text">Hỗ trợ</span>
                        </h1>
                        <p className="text-lg max-w-2xl mx-auto"
                            style={{ color: 'var(--public-text-body)' }}>
                            Hỏi đáp nhanh với Trợ lý AI hoặc liên hệ trực tiếp Quản trị viên cho các yêu cầu phức tạp.
                        </p>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch lg:h-[750px] mb-12">

                        {/* ── Left: AI Chat ── */}
                        <div className="flex flex-col rounded-3xl shadow-xl overflow-hidden h-full"
                            style={{
                                background: 'var(--glass-card-bg)',
                                border: '1px solid var(--glass-card-border)',
                                backdropFilter: 'blur(16px)'
                            }}>

                            {/* Chat header */}
                            <div className="p-5 flex items-center justify-between gap-4"
                                style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--hover-bg)' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 icon-box-violet">
                                        <Bot className="text-violet-500 w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold leading-tight"
                                            style={{ color: 'var(--glass-text-primary)' }}>Trợ lý ảo SMP</h2>
                                        <p className="text-sm" style={{ color: 'var(--glass-text-muted)' }}>Trực tuyến 24/7</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClearChat}
                                    className="px-3 py-1.5 text-xs text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors"
                                    style={{ border: '1px solid var(--icon-border-rose)' }}
                                    title="Xóa đoạn chat">
                                    Xóa chat
                                </button>
                            </div>

                            {/* Messages area */}
                            <div ref={chatContainerRef}
                                className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'model' && (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 icon-box-violet">
                                                <Bot className="text-violet-500 w-4 h-4" />
                                            </div>
                                        )}
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                                            style={msg.role === 'user'
                                                ? { background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: '#fff' }
                                                : { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
                                            {msg.points ? (
                                                <ul className="space-y-2 text-sm sm:text-base leading-relaxed p-0 m-0">
                                                    {msg.points.map((point, pIdx) => (
                                                        <li key={pIdx} className="flex gap-2">
                                                            <span className="text-violet-500 mt-1">•</span>
                                                            <span dangerouslySetInnerHTML={{ __html: point.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                                                    {msg.text?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || ''}
                                                </p>
                                            )}
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                                                style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-default)' }}>
                                                <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-3 justify-start">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 icon-box-violet">
                                            <Bot className="text-violet-500 w-4 h-4" />
                                        </div>
                                        <div className="max-w-[75%] rounded-2xl px-5 py-4 rounded-tl-sm flex items-center gap-1.5"
                                            style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-default)' }}>
                                            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input bar */}
                            <div className="p-4" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--hover-bg)' }}>
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Nhập câu hỏi của bạn..."
                                        className="flex-1 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                                        style={{
                                            background: 'var(--bg-surface)',
                                            border: '1px solid var(--border-default)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isTyping}
                                        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 flex items-center justify-center transition-colors shadow-md"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* ── Right: Contact Form ── */}
                        <div className="flex flex-col rounded-3xl shadow-xl overflow-hidden h-full p-6 sm:p-8"
                            style={{
                                background: 'var(--glass-card-bg)',
                                border: '1px solid var(--glass-card-border)',
                                backdropFilter: 'blur(16px)'
                            }}>
                            <div className="mb-8">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 icon-box-indigo">
                                    <Mail className="text-indigo-500 w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2"
                                    style={{ color: 'var(--glass-text-primary)' }}>Kết nối Quản trị viên</h2>
                                <p style={{ color: 'var(--glass-text-body)' }}>
                                    Hãy để lại thông tin nếu bạn cần báo giá, hợp tác, hoặc tư vấn chuyên sâu.
                                </p>
                            </div>

                            <form ref={formRef} onSubmit={handleSendEmail} className="flex-1 flex flex-col gap-5 justify-between">
                                <div className="space-y-5">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1"
                                            style={{ color: 'var(--glass-text-primary)' }}>
                                            Họ và tên <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text" name="name" required
                                            placeholder="Nguyễn Văn A"
                                            className="w-full rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            style={{
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-default)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1"
                                            style={{ color: 'var(--glass-text-primary)' }}>
                                            Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email" name="email" required
                                            placeholder="email@truonghoc.vn"
                                            className="w-full rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            style={{
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-default)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                    {/* Message */}
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1"
                                            style={{ color: 'var(--glass-text-primary)' }}>
                                            Nội dung <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            name="message" required
                                            placeholder="Bạn cần hỗ trợ gì?"
                                            rows="4"
                                            className="w-full rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none h-32 custom-scrollbar"
                                            style={{
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-default)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-medium rounded-xl px-6 py-3.5 flex items-center justify-center gap-2 transition-all shadow-lg mt-auto"
                                >
                                    {isSending ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" />Đang gửi...</>
                                    ) : (
                                        <><Send className="w-5 h-5" />Gửi yêu cầu</>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Dialog */}
            {showSuccessDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm animate-in fade-in duration-300"
                    style={{ background: 'var(--overlay-bg)' }}>
                    <div className="w-full max-w-sm rounded-3xl shadow-2xl p-6 sm:p-8 transform transition-all animate-in zoom-in-95 duration-300"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <div className="flex justify-end mb-2">
                            <button onClick={() => setShowSuccessDialog(false)}
                                className="transition-colors"
                                style={{ color: 'var(--text-secondary)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                                style={{ background: 'var(--icon-bg-emerald)' }}>
                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                Gửi thành công!
                            </h3>
                            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                                Cảm ơn bạn đã liên hệ. Quản trị viên sẽ phản hồi bạn trong thời gian sớm nhất qua email.
                            </p>
                            <button
                                onClick={() => setShowSuccessDialog(false)}
                                className="w-full font-medium rounded-xl px-6 py-3 transition-colors"
                                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
