'use client'

import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════════════════
   OBSIDIAN GLASS UI COMPONENTS
   Neumorphic + Holographic design system
   ═══════════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// NEO CARD — Neumorphic glass card with hover effects
// ─────────────────────────────────────────────────────────────────────────────

interface NeoCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  as?: 'div' | 'article' | 'section'
}

export const NeoCard = forwardRef<HTMLDivElement, NeoCardProps>(
  ({ children, className = '', hover = true, glow = false, as = 'div' }, ref) => {
    const Component = motion[as]
    
    return (
      <Component
        ref={ref}
        whileHover={hover ? { y: -4, transition: { duration: 0.3 } } : undefined}
        className={`
          relative rounded-2xl overflow-hidden
          bg-[hsla(220,25%,8%,0.85)] backdrop-blur-xl
          border border-[hsla(160,60%,40%,0.15)]
          shadow-[12px_12px_40px_hsla(220,30%,0%,0.4),-6px_-6px_20px_hsla(160,50%,30%,0.02)]
          transition-all duration-300
          ${hover ? 'hover:border-[hsla(160,60%,50%,0.25)] hover:shadow-[16px_16px_50px_hsla(220,30%,0%,0.5),0_0_30px_hsla(160,100%,50%,0.08)]' : ''}
          ${glow ? 'shadow-[0_0_60px_-20px_hsla(160,100%,50%,0.2)]' : ''}
          ${className}
        `}
      >
        {/* Inner glow effect */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsla(160,100%,50%,0.03)] via-transparent to-[hsla(180,100%,50%,0.02)]" />
          <div className="absolute inset-[1px] rounded-2xl border border-[hsla(160,60%,40%,0.08)]" />
        </div>
        <div className="relative z-10">{children}</div>
      </Component>
    )
  }
)
NeoCard.displayName = 'NeoCard'

// ─────────────────────────────────────────────────────────────────────────────
// NEO BUTTON — Neumorphic button with press states
// ─────────────────────────────────────────────────────────────────────────────

interface NeoButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  onClick?: () => void
  disabled?: boolean
}

export function NeoButton({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  disabled = false
}: NeoButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  }
  
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-[hsl(160,80%,35%)] to-[hsl(170,75%,40%)]
      text-[hsl(220,25%,3%)] font-semibold
      shadow-[6px_6px_20px_hsla(220,30%,0%,0.4),-3px_-3px_12px_hsla(160,50%,40%,0.05)]
      hover:shadow-[8px_8px_25px_hsla(220,30%,0%,0.5),0_0_25px_hsla(160,100%,50%,0.25)]
      hover:from-[hsl(160,85%,40%)] hover:to-[hsl(170,80%,45%)]
      active:shadow-[inset_4px_4px_12px_hsla(160,80%,15%,0.4)]
    `,
    secondary: `
      bg-[hsla(220,25%,8%,0.85)] backdrop-blur-xl
      text-[hsl(160,90%,55%)] font-medium
      border border-[hsla(160,60%,50%,0.25)]
      shadow-[4px_4px_15px_hsla(220,30%,0%,0.3)]
      hover:bg-[hsla(220,25%,10%,0.9)]
      hover:border-[hsl(160,84%,39%)]
      hover:shadow-[6px_6px_20px_hsla(220,30%,0%,0.4),0_0_20px_hsla(160,100%,50%,0.1)]
    `,
    ghost: `
      bg-transparent
      text-[hsl(220,15%,70%)] font-medium
      hover:text-[hsl(160,90%,55%)]
      hover:bg-[hsla(160,50%,40%,0.1)]
    `
  }
  
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    rounded-xl cursor-pointer
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-[hsl(160,90%,55%)] focus:ring-offset-2 focus:ring-offset-[hsl(220,25%,3%)]
  `
  
  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`
  
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }
  
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ y: 1 }}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GLASS PANEL — Large glass morphism container
// ─────────────────────────────────────────────────────────────────────────────

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export function GlassPanel({ children, className = '', glow = false }: GlassPanelProps) {
  return (
    <div
      className={`
        relative rounded-3xl overflow-hidden
        bg-[hsla(220,25%,8%,0.85)] backdrop-blur-2xl
        border border-[hsla(160,60%,40%,0.15)]
        ${glow ? 'shadow-[0_0_60px_-20px_hsla(160,100%,50%,0.2),inset_0_0_60px_-30px_hsla(160,100%,50%,0.05)]' : ''}
        ${className}
      `}
    >
      {/* Prismatic top edge */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsla(160,100%,50%,0.3)] to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER — Consistent section titles
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = ''
}: SectionHeaderProps) {
  return (
    <div className={`${align === 'center' ? 'text-center' : ''} ${className}`}>
      {eyebrow && (
        <p className="text-xs font-mono font-semibold tracking-[0.2em] uppercase text-[hsl(160,84%,39%)] mb-3 animate-fade-in-up">
          {eyebrow}
        </p>
      )}
      <h2
        className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[hsl(220,15%,95%)] animate-fade-in-up animation-delay-100"
        style={{ textShadow: '0 0 40px hsla(160, 100%, 50%, 0.15)' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-[hsl(220,15%,70%)] max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ICON WRAPPER — Silhouette icon with glow
// ─────────────────────────────────────────────────────────────────────────────

interface IconWrapperProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  color?: 'emerald' | 'cyan' | 'amber' | 'violet'
  className?: string
}

export function IconWrapper({
  children,
  size = 'md',
  color = 'emerald',
  className = ''
}: IconWrapperProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  }
  
  const colorClasses = {
    emerald: 'bg-[hsla(160,80%,40%,0.15)] text-[hsl(160,90%,55%)]',
    cyan: 'bg-[hsla(180,80%,40%,0.15)] text-[hsl(180,85%,55%)]',
    amber: 'bg-[hsla(38,90%,50%,0.15)] text-[hsl(38,92%,55%)]',
    violet: 'bg-[hsla(270,70%,55%,0.15)] text-[hsl(270,70%,65%)]'
  }
  
  return (
    <div
      className={`
        ${sizeClasses[size]} ${colorClasses[color]}
        rounded-xl flex items-center justify-center
        transition-all duration-300
        group-hover:scale-110
        ${className}
      `}
      style={{
        filter: 'drop-shadow(0 0 8px hsla(160, 100%, 50%, 0.2))'
      }}
    >
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DIVIDER — Section divider with sparkle
// ─────────────────────────────────────────────────────────────────────────────

export function Divider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 py-16 ${className}`}>
      <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-[hsla(160,60%,40%,0.3)]" />
      <div className="w-2 h-2 rounded-full bg-[hsl(160,84%,39%)] shadow-[0_0_12px_hsla(160,100%,50%,0.5)]" />
      <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-[hsla(160,60%,40%,0.3)]" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE CARD — Compact feature highlight card
// ─────────────────────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color?: 'emerald' | 'cyan' | 'amber' | 'violet'
  delay?: number
}

export function FeatureCard({
  icon,
  title,
  description,
  color = 'emerald',
  delay = 0
}: FeatureCardProps) {
  return (
    <div 
      className="group animate-fade-in-up"
      style={{ animationDelay: `${delay * 1000}ms` }}
    >
      <NeoCard className="p-6 h-full">
        <IconWrapper color={color} className="mb-4">
          {icon}
        </IconWrapper>
        <h3 className="text-lg font-semibold text-[hsl(220,15%,95%)] mb-2">
          {title}
        </h3>
        <p className="text-sm text-[hsl(220,15%,60%)] leading-relaxed">
          {description}
        </p>
      </NeoCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HIERARCHY CARD — Fabric tier visualization
// ─────────────────────────────────────────────────────────────────────────────

interface HierarchyCardProps {
  icon: React.ReactNode
  name: string
  description: string
  level: string
  color: 'amber' | 'violet' | 'cyan' | 'emerald'
  delay?: number
}

export function HierarchyCard({
  icon,
  name,
  description,
  level,
  color,
  delay = 0
}: HierarchyCardProps) {
  const colorMap = {
    amber: { bg: 'hsla(38,90%,50%,0.1)', text: 'hsl(38,92%,55%)', glow: 'hsla(38,100%,50%,0.3)' },
    violet: { bg: 'hsla(270,70%,55%,0.1)', text: 'hsl(270,70%,65%)', glow: 'hsla(270,100%,60%,0.3)' },
    cyan: { bg: 'hsla(180,80%,40%,0.1)', text: 'hsl(180,85%,55%)', glow: 'hsla(180,100%,50%,0.3)' },
    emerald: { bg: 'hsla(160,80%,40%,0.1)', text: 'hsl(160,90%,55%)', glow: 'hsla(160,100%,50%,0.3)' }
  }
  
  const colors = colorMap[color]
  
  return (
    <div 
      className="group animate-fade-in-up"
      style={{ animationDelay: `${delay * 1000}ms` }}
    >
      <NeoCard className="p-6 h-full text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110"
          style={{
            background: colors.bg,
            color: colors.text,
            filter: `drop-shadow(0 0 12px ${colors.glow})`
          }}
        >
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-1" style={{ color: colors.text }}>
          {name}
        </h3>
        <p className="text-xs uppercase tracking-widest text-[hsl(220,15%,50%)] mb-3">
          {level}
        </p>
        <p className="text-sm text-[hsl(220,15%,60%)] leading-relaxed">
          {description}
        </p>
      </NeoCard>
    </div>
  )
}

