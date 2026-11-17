/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,tsx}",
        "./views/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./App.tsx",
        "./Layout.tsx",
    ],
    theme: {
        extend: {
            colors: {
                slate: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                },
                primary: {
                    DEFAULT: '#0284c7', // Sky 600
                    foreground: '#ffffff',
                },
                secondary: {
                    DEFAULT: '#f1f5f9', // Slate 100
                    foreground: '#0f172a', // Slate 900
                },
                muted: {
                    DEFAULT: '#f8fafc', // Slate 50
                    foreground: '#64748b', // Slate 500
                },
                accent: {
                    DEFAULT: '#e0f2fe', // Sky 100
                    foreground: '#0369a1', // Sky 700
                },
                destructive: {
                    DEFAULT: '#ef4444', // Red 500
                    foreground: '#ffffff',
                },
                // Aliases for compatibility during refactor, mapped to clean colors
                hydro: {
                    ice: '#f8fafc',        // Slate 50
                    mist: '#f1f5f9',       // Slate 100
                    glass: '#ffffff',      // White
                    deep: '#1e293b',       // Slate 800
                    electric: '#0284c7',   // Sky 600 (Primary)
                    coral: '#ef4444',      // Red 500
                    mint: '#10b981',       // Emerald 500
                },
                'signal-orange': '#ff4d00',
            },
            animation: {
                loading: 'loading 2s infinite',
            },
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
                display: ['"Outfit"', '"Space Grotesk"', 'sans-serif'],
            },
            boxShadow: {
                'sm': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
                'md': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
                'lg': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
                'xl': '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 15px rgba(2, 132, 199, 0.3)',
            },
            borderRadius: {
                'lg': '0.5rem',
                'xl': '0.75rem',
                '2xl': '1rem',
            }
        },
    },
    plugins: [],
}
