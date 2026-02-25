/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['selector', '[data-theme="dark"]'],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                // Custom colors if needed, but we will use standard tailwind colors for gradients
            }
        },
    },
    plugins: [],
}

// DEBUG: Log when tailwind config is loaded (should only appear in build, not browser)
if (typeof console !== 'undefined') {
    // This will only log in Node.js, not in browser
    console.log('[tailwind.config.js] loaded, darkMode:', module.exports?.darkMode || 'unknown');
}
