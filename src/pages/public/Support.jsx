import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Mail, Loader2, CheckCircle, X } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { useNotifications } from '@/context/NotificationContext';

export default function Support() {
    const { addNotification } = useNotifications();

    // --- AI Chat State ---
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

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

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
            const token = localStorage.getItem('token');
            // Format history for Gemini API (user and model)
            // Skip the very first "Xin chào!" model message because Gemini API requires history to start with a 'user' turn.
            const validHistoryToSubmit = messages
                .filter(m => m.role !== 'system' && !(m.role === 'model' && m.text?.includes('Xin chào! Tôi là trợ lý ảo')))
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.text || (m.points ? m.points.join('\n') : '') }]
                }));

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMsg, history: validHistoryToSubmit })
            });

            if (response.status === 401 || response.status === 403) {
                throw new Error('Bạn không có quyền hoặc phiên đăng nhập đã hết hạn.');
            }
            if (!response.ok) throw new Error('Không thể kết nối đến AI');

            const data = await response.json();

            // Handle new JSON schema { points } or fallback to { text }
            const newMessage = { role: 'model' };
            if (data.points && Array.isArray(data.points)) {
                newMessage.points = data.points;
            } else {
                newMessage.text = data.text || 'Khong co du lieu phan hoi';
            }

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

            // Show success dialog
            setShowSuccessDialog(true);

            // Auto close after 5 seconds
            setTimeout(() => {
                setShowSuccessDialog(false);
            }, 5000);

            formRef.current.reset();
        } catch (error) {
            console.error('Email error:', error);
            addNotification(
                'Không thể gửi tin nhắn. Vui lòng kiểm tra lại cấu hình hoặc thử lại sau.',
                'error'
            );
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex-1 w-full bg-slate-50 dark:bg-[#0B1120] flex flex-col transition-colors duration-300 overflow-hidden">
            <div className="flex-1 overflow-y-auto relative pb-12 px-4 sm:px-6 lg:px-8 pt-24 lg:pt-28 custom-scrollbar">
                {/* Background Orbs matching relative container layer */}
                <div className="absolute top-0 left-[-10vw] w-[40vw] h-[40vw] bg-violet/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10vw] right-[-10vw] w-[40vw] h-[40vw] bg-indigo/20 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                            Trung tâm <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet to-indigo">Hỗ trợ</span>
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Hỏi đáp nhanh với Trợ lý AI hoặc liên hệ trực tiếp Quản trị viên cho các yêu cầu phức tạp.
                        </p>
                    </div>

                    {/* Bento Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch lg:h-[750px] mb-12">

                        {/* Left Column: AI Chat */}
                        <div className="flex flex-col bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl dark:shadow-2xl overflow-hidden h-full">
                            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-violet/10 flex items-center justify-center border border-violet/20 flex-shrink-0">
                                        <Bot className="text-violet-500 w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-800 dark:text-white leading-tight">Trợ lý ảo SMP</h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Trực tuyến 24/7</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClearChat}
                                    className="px-3 py-1.5 text-xs text-rose-500 hover:text-white hover:bg-rose-500 dark:text-rose-400 dark:hover:text-white dark:hover:bg-rose-600 rounded-lg transition-colors border border-rose-200 dark:border-rose-900 shadow-sm"
                                    title="Xóa đoạn chat (Bộ nhớ tạm)"
                                >
                                    Xóa chat
                                </button>
                            </div>

                            <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'model' && (
                                            <div className="w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center border border-violet/20 flex-shrink-0 mt-1">
                                                <Bot className="text-violet-500 w-4 h-4" />
                                            </div>
                                        )}
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-r from-violet to-indigo text-white rounded-tr-sm'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 rounded-tl-sm'
                                            }`}>
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
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-300 dark:border-slate-600 flex-shrink-0 mt-1">
                                                <User className="text-slate-500 dark:text-slate-300 w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-3 justify-start">
                                        <div className="w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center border border-violet/20 flex-shrink-0 mt-1">
                                            <Bot className="text-violet-500 w-4 h-4" />
                                        </div>
                                        <div className="max-w-[75%] rounded-2xl px-5 py-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-tl-sm flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-violet/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 bg-violet/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 bg-violet/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-white/10">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Nhập câu hỏi của bạn..."
                                        className="flex-1 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet/50 transition-all dark:focus:border-violet/50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isTyping}
                                        className="bg-violet hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 flex items-center justify-center transition-colors shadow-md shadow-violet/20"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Right Column: Connect Form */}
                        <div className="flex flex-col bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl dark:shadow-2xl overflow-hidden h-full p-6 sm:p-8">
                            <div className="mb-8">
                                <div className="w-12 h-12 rounded-full bg-indigo/10 flex items-center justify-center border border-indigo/20 mb-4 inline-flex">
                                    <Mail className="text-indigo-500 w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Kết nối Quản trị viên</h2>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Hãy để lại thông tin nếu bạn cần báo giá, hợp tác, hoặc tư vấn chuyên sâu.
                                </p>
                            </div>

                            <form ref={formRef} onSubmit={handleSendEmail} className="flex-1 flex flex-col gap-5 justify-between">
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Họ và tên <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            placeholder="Nguyễn Văn A"
                                            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo/50 transition-all dark:focus:border-indigo/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            placeholder="email@truonghoc.vn"
                                            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo/50 transition-all dark:focus:border-indigo/50"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Nội dung <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            name="message"
                                            required
                                            placeholder="Bạn cần hỗ trợ gì?"
                                            rows="4"
                                            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo/50 transition-all dark:focus:border-indigo/50 resize-none h-32 custom-scrollbar"
                                        ></textarea>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="w-full bg-indigo hover:bg-indigo-600 disabled:opacity-70 text-white font-medium rounded-xl px-6 py-3.5 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo/25 mt-auto"
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Đang gửi...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Gửi yêu cầu
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Dialog Modal */}
            {showSuccessDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 transform transition-all animate-in zoom-in-95 duration-300">
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={() => setShowSuccessDialog(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-6 scale-110">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Gửi thành công!
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                                Cảm ơn bạn đã liên hệ. Quản trị viên sẽ phản hồi bạn trong thời gian sớm nhất qua email.
                            </p>
                            <button
                                onClick={() => setShowSuccessDialog(false)}
                                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl px-6 py-3 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
