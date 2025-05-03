
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
            typography: {
                DEFAULT: {
                    css: {
                        maxWidth: '100%',
                        color: 'inherit',
                        a: {
                            color: 'inherit',
                            textDecoration: 'underline',
                            fontWeight: '500',
                        },
                        p: {
                            marginTop: '0.75em',
                            marginBottom: '0.75em',
                            lineHeight: '1.6',
                        },
                        'h1, h2, h3, h4': {
                            color: 'inherit',
                            marginTop: '1.25em',
                            marginBottom: '0.75em',
                            lineHeight: '1.3',
                            fontWeight: '600',
                        },
                        h1: {
                            fontSize: '1.875rem',
                        },
                        h2: {
                            fontSize: '1.5rem',
                        },
                        h3: {
                            fontSize: '1.25rem',
                        },
                        h4: {
                            fontSize: '1.125rem',
                        },
                        ul: {
                            paddingLeft: '1.5em',
                            listStyleType: 'disc',
                            marginTop: '0.75em',
                            marginBottom: '0.75em',
                        },
                        ol: {
                            paddingLeft: '1.5em',
                            listStyleType: 'decimal',
                            marginTop: '0.75em',
                            marginBottom: '0.75em',
                        },
                        li: {
                            marginTop: '0.375em',
                            marginBottom: '0.375em',
                            display: 'list-item',
                        },
                        blockquote: {
                            fontStyle: 'italic',
                            borderLeftWidth: '4px',
                            borderLeftColor: 'hsl(var(--muted))',
                            paddingLeft: '1em',
                            marginLeft: '0',
                            marginRight: '0',
                        },
                        code: {
                            color: 'inherit',
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            padding: '0.2em 0.4em',
                            borderRadius: '0.25em',
                            fontWeight: '400',
                        },
                        strong: {
                            fontWeight: '700',
                        },
                        em: {
                            fontStyle: 'italic',
                        },
                        table: {
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                        },
                        'thead th': {
                          fontWeight: '600',
                          borderBottomWidth: '1px',
                        },
                        'tbody td, tfoot td': {
                          padding: '0.75em',
                          borderBottomWidth: '1px',
                          borderBottomColor: 'hsl(var(--border))',
                        }
                    },
                },
            },
		}
	},
	plugins: [
        require("tailwindcss-animate"),
        require('@tailwindcss/typography'),
    ],
} satisfies Config;
