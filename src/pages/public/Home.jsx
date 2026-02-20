import React from 'react';
import Hero from '@/sections/Hero';
import Features from '@/sections/Features';
import Analytics from '@/sections/Analytics';
import Contact from '@/sections/Contact';
import Footer from '@/sections/Footer';

export default function PublicHome() {
    return (
        <main className="relative">
            <div className="noise-overlay" />
            <Hero />
            <Features />
            <Analytics />
            <Contact />
            <Footer />
        </main>
    );
}
