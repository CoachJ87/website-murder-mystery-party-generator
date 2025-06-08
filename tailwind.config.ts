
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
				/* Mystery Maker Color System - Sophisticated & Premium */
				primary: {
					DEFAULT: 'hsl(var(--color-primary))',
					foreground: 'hsl(var(--color-primary-foreground))',
					hover: 'hsl(var(--color-primary-hover))',
					light: 'hsl(var(--color-primary-light))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--color-secondary))',
					foreground: 'hsl(var(--color-secondary-foreground))',
					hover: 'hsl(var(--color-secondary-hover))',
					light: 'hsl(var(--color-secondary-light))',
				},
				accent: {
					DEFAULT: 'hsl(var(--color-accent))',
					foreground: 'hsl(var(--color-accent-foreground))',
					hover: 'hsl(var(--color-accent-hover))',
					light: 'hsl(var(--color-accent-light))',
				},
				danger: {
					DEFAULT: 'hsl(var(--color-danger))',
					foreground: 'hsl(var(--color-danger-foreground))',
					hover: 'hsl(var(--color-danger-hover))',
					light: 'hsl(var(--color-danger-light))',
				},
				surface: {
					DEFAULT: 'hsl(var(--color-surface))',
					foreground: 'hsl(var(--color-surface-foreground))',
					hover: 'hsl(var(--color-surface-hover))',
				},
				subtle: {
					DEFAULT: 'hsl(var(--color-subtle))',
					foreground: 'hsl(var(--color-subtle-foreground))',
				},
				tertiary: 'hsl(var(--color-tertiary))',
				
				/* System Colors */
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--color-muted))',
					foreground: 'hsl(var(--color-muted-foreground))'
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
                        color: 'hsl(var(--color-surface-foreground))',
                        a: {
                            color: 'hsl(var(--color-primary))',
                            textDecoration: 'underline',
                            fontWeight: '500',
                            '&:hover': {
                                color: 'hsl(var(--color-primary-hover))',
                            },
                        },
                        p: {
                            marginTop: '0.75em',
                            marginBottom: '0.75em',
                            lineHeight: '1.6',
                            color: 'hsl(var(--color-surface-foreground))',
                        },
                        'h1, h2, h3, h4': {
                            color: 'hsl(var(--color-primary))',
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
                            color: 'hsl(var(--color-surface-foreground))',
                        },
                        blockquote: {
                            fontStyle: 'italic',
                            borderLeftWidth: '4px',
                            borderLeftColor: 'hsl(var(--color-accent))',
                            backgroundColor: 'hsl(var(--color-accent) / 0.1)',
                            paddingLeft: '1em',
                            paddingTop: '0.5em',
                            paddingBottom: '0.5em',
                            marginLeft: '0',
                            marginRight: '0',
                            color: 'hsl(var(--color-surface-foreground))',
                        },
                        code: {
                            color: 'hsl(var(--color-secondary))',
                            backgroundColor: 'hsl(var(--color-muted))',
                            padding: '0.2em 0.4em',
                            borderRadius: '0.25em',
                            fontWeight: '400',
                        },
                        strong: {
                            fontWeight: '700',
                            color: 'hsl(var(--color-secondary))',
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
                          backgroundColor: 'hsl(var(--color-primary) / 0.1)',
                          color: 'hsl(var(--color-primary))',
                        },
                        'tbody td, tfoot td': {
                          padding: '0.75em',
                          borderBottomWidth: '1px',
                          borderBottomColor: 'hsl(var(--border))',
                          color: 'hsl(var(--color-surface-foreground))',
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
