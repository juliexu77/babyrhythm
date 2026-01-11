import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Clean sans-serif throughout - Inter for everything
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        display: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        serif: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        num: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        athletic: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        'rare': '-0.015em',
        'rare-tight': '-0.025em',
        'caps': '0.08em', // Strava uses wider letter-spacing for uppercase
        'tight': '-0.02em', // Tight tracking for large numbers
      },
      fontWeight: {
        'body': '400',
        'label': '600', // Strava uses bolder labels
        'heading': '700', // Bold headings
        'stat': '800', // Extra bold for stats
      },
      lineHeight: {
        'body': '1.5',
        'heading': '1.2', // Tighter for headlines
        'stat': '1.0', // Very tight for large numbers
      },
      fontSize: {
        // Strava-style: bold, prominent stats
        'stat-xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '800' }],
        'stat-lg': ['2.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'stat-md': ['1.75rem', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '700' }],
        'stat-sm': ['1.375rem', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '700' }],
        // Section labels - small caps style
        'label-xs': ['0.625rem', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '500' }],
      },
      opacity: {
        'icon': '0.88',
        'icon-soft': '0.75',
      },
      colors: {
        // Rare Beauty palette
        'rose-clay': 'hsl(12, 50%, 81%)',
        'dusty-blush': 'hsl(15, 45%, 76%)',
        'terracotta': 'hsl(8, 45%, 60%)',
        'berry-mauve': 'hsl(350, 35%, 46%)',
        'warm-beige': 'hsl(20, 40%, 93%)',
        // Standard tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success-muted))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted: "hsl(var(--warning-muted))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          muted: "hsl(var(--info-muted))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "card-ombre": {
          "1": "hsl(var(--card-ombre-1))",
          "1-dark": "hsl(var(--card-ombre-1-dark))",
          "2": "hsl(var(--card-ombre-2))",
          "2-dark": "hsl(var(--card-ombre-2-dark))",
          "3": "hsl(var(--card-ombre-3))",
          "3-dark": "hsl(var(--card-ombre-3-dark))",
          "4": "hsl(var(--card-ombre-4))",
          "4-dark": "hsl(var(--card-ombre-4-dark))",
        },
        feed: "hsl(var(--feed-color))",
        diaper: "hsl(var(--diaper-color))",
        nap: "hsl(var(--nap-color))",
        note: "hsl(var(--note-color))",
        chat: "hsl(var(--chat-color))",
        cta: {
          "gradient-start": "hsl(var(--cta-gradient-start))",
          "gradient-end": "hsl(var(--cta-gradient-end))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-feed': 'var(--gradient-feed)',
        'gradient-diaper': 'var(--gradient-diaper)',
        'gradient-nap': 'var(--gradient-nap)',
        'gradient-note': 'var(--gradient-note)',
        'gradient-chat': 'var(--gradient-chat)',
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
        // Sharp, modern shadows for depth/separation
        'sharp': '0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.1)',
        'sharp-md': '0 2px 4px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.12)',
        'sharp-lg': '0 4px 8px rgba(0, 0, 0, 0.1), 0 16px 32px rgba(0, 0, 0, 0.15)',
        'sharp-hover': '0 2px 4px rgba(0, 0, 0, 0.08), 0 12px 24px rgba(0, 0, 0, 0.14)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)", 
        sm: "calc(var(--radius) - 4px)",
        // Sharp unified radiuses
        "strava": "2px",
        "strava-sm": "1px",
        "strava-lg": "2px",
        "sharp": "2px",
        "pill": "9999px",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "bounce-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.95)"
          },
          "50%": {
            opacity: "0.8",
            transform: "scale(1.02)"
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)"
          }
        },
        "flash": {
          "0%, 100%": {
            opacity: "1"
          },
          "50%": {
            opacity: "0.7"
          }
        },
        "glow": {
          "0%, 100%": {
            boxShadow: "0 0 5px hsl(var(--primary))"
          },
          "50%": {
            boxShadow: "0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary))"
          }
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 15px -5px hsla(15, 45%, 60%, 0.15), 0 8px 20px -4px hsla(15, 50%, 40%, 0.1)"
          },
          "50%": {
            boxShadow: "0 0 25px -5px hsla(15, 45%, 60%, 0.25), 0 10px 25px -4px hsla(15, 50%, 40%, 0.12)"
          }
        },
        "shimmer": {
          "0%": {
            backgroundPosition: "-200% 0"
          },
          "100%": {
            backgroundPosition: "200% 0"
          }
        },
        "soft-bounce": {
          "0%, 100%": {
            transform: "translateY(0)"
          },
          "50%": {
            transform: "translateY(-2px)"
          }
        },
        "breathe": {
          "0%, 100%": {
            opacity: "0.4",
            transform: "scale(1)"
          },
          "50%": {
            opacity: "0.8",
            transform: "scale(1.05)"
          }
        },
        "breathe-dark": {
          "0%, 100%": {
            opacity: "0.6",
            transform: "scale(1)",
            boxShadow: "0 0 0 rgba(76, 175, 125, 0)"
          },
          "50%": {
            opacity: "1",
            transform: "scale(1.02)",
            boxShadow: "0 0 15px rgba(76, 175, 125, 0.4)"
          }
        },
        // Today's Story Modal Animations
        "story-photo-blur-in": {
          "0%": {
            filter: "blur(20px)",
            opacity: "0"
          },
          "100%": {
            filter: "blur(0px)",
            opacity: "1"
          }
        },
        "story-glow-corners": {
          "0%": {
            opacity: "0"
          },
          "100%": {
            opacity: "1"
          }
        },
        "story-headline-fade-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(8px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "story-card-slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "story-bar-feed": {
          "0%": {
            transform: "scaleX(0)",
            transformOrigin: "left"
          },
          "80%": {
            transform: "scaleX(1.05)"
          },
          "100%": {
            transform: "scaleX(1)"
          }
        },
        "story-bar-nap": {
          "0%": {
            transform: "scaleX(0)",
            transformOrigin: "left"
          },
          "100%": {
            transform: "scaleX(1)"
          }
        },
        "story-bar-naptime": {
          "0%": {
            transform: "scaleX(0)",
            transformOrigin: "left"
          },
          "80%": {
            transform: "scaleX(1.03)"
          },
          "100%": {
            transform: "scaleX(1)"
          }
        },
        "story-window-pulse": {
          "0%, 100%": {
            opacity: "1"
          },
          "50%": {
            opacity: "0.7"
          }
        },
        "story-shimmer-sweep": {
          "0%": {
            transform: "translateX(-100%)",
            opacity: "0"
          },
          "50%": {
            opacity: "1"
          },
          "100%": {
            transform: "translateX(100%)",
            opacity: "0"
          }
        },
        "story-sparkle-sweep": {
          "0%": {
            transform: "translateX(0) translateY(0)",
            opacity: "0"
          },
          "20%": {
            opacity: "0.4"
          },
          "100%": {
            transform: "translateX(100vw) translateY(-20vh)",
            opacity: "0"
          }
        },
        "story-sparkle-rise": {
          "0%": {
            transform: "translateY(0) scale(1)",
            opacity: "0.6"
          },
          "100%": {
            transform: "translateY(-80px) scale(0.5)",
            opacity: "0"
          }
        },
        "story-closure-fade": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "story-dusk-overlay": {
          "0%": {
            opacity: "0"
          },
          "100%": {
            opacity: "1"
          }
        },
        "cta-pulse": {
          "0%, 100%": {
            opacity: "1"
          },
          "50%": {
            opacity: "0.9"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 180ms ease-in-out",
        "fade-in-dark": "fade-in 140ms ease-out",
        "bounce-in": "bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "flash": "flash 0.5s ease-in-out",
        "glow": "glow 1s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "soft-bounce": "soft-bounce 2s ease-in-out infinite",
        "breathe": "breathe 2s ease-in-out infinite",
        "breathe-dark": "breathe-dark 1.8s ease-out infinite",
        // Today's Story Modal Animations
        "story-photo-blur-in": "story-photo-blur-in 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "story-glow-corners": "story-glow-corners 2s ease-out forwards",
        "story-headline-type": "story-headline-fade-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.6s forwards",
        "story-headline-fade-up": "story-headline-fade-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "story-card-slide-up": "story-card-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "story-bar-feed": "story-bar-feed 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "story-bar-nap": "story-bar-nap 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "story-bar-naptime": "story-bar-naptime 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "story-window-pulse": "story-window-pulse 2s ease-in-out infinite",
        "story-shimmer-sweep": "story-shimmer-sweep 1s ease-out forwards",
        "story-sparkle-sweep": "story-sparkle-sweep 2s ease-out",
        "story-sparkle-rise": "story-sparkle-rise 1s ease-out forwards",
        "story-closure-fade": "story-closure-fade 1s ease-out forwards",
        "story-dusk-overlay": "story-dusk-overlay 1s ease-out forwards",
        "cta-pulse": "cta-pulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Custom dusk variant for dusk mode
    plugin(function({ addVariant }) {
      addVariant('dusk', '.dusk &');
    }),
  ],
} satisfies Config;
