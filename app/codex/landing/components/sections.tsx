'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Brain,
  Search,
  Network,
  Link2,
  FileText,
  Zap,
  Globe,
  Shield,
  Palette,
  ArrowRight,
  ChevronDown,
  Github,
  Check,
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  Play,
  Users,
  Building2,
  GraduationCap,
  Code2,
  Database,
  GitBranch,
  X,
  Eye,
  PenTool,
  ImageIcon,
  Tag,
  Hash,
  Filter,
} from 'lucide-react'
import { useGithubTree } from '@/components/codex/hooks/useGithubTree'
import { GUMROAD_PRODUCT_URL } from '@/lib/config/gumroad'

/* ═══════════════════════════════════════════════════════════════════════════════
   MODERN HERO SECTION
   Clean, minimal, powerful typography
   ═══════════════════════════════════════════════════════════════════════════════ */

export function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-4 pt-28 pb-20 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-emerald-500/8 dark:bg-emerald-500/5 rounded-full blur-[100px]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
          className="absolute bottom-20 right-1/3 w-[400px] h-[400px] bg-teal-500/8 dark:bg-teal-500/5 rounded-full blur-[80px]"
        />
        {/* Floating animated orbs */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 right-1/4 w-3 h-3 bg-emerald-400/40 rounded-full blur-sm"
        />
        <motion.div
          animate={{
            y: [0, 15, 0],
            x: [0, -15, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/3 left-1/4 w-2 h-2 bg-cyan-400/40 rounded-full blur-sm"
        />
        <motion.div
          animate={{
            y: [0, -12, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute top-1/3 left-[15%] w-4 h-4 bg-teal-400/30 rounded-full blur-sm"
        />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Main headline with staggered animation */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
        >
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-block text-gray-900 dark:text-white"
          >
            The Notetaking App
          </motion.span>
          <br />
          <motion.span
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="inline-block bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent"
          >
            That Organizes Itself
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          Your forever second brain. Automatic connections. Semantic search.
          100% offline, 100% yours.
        </motion.p>

        {/* Edition callout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="flex flex-wrap justify-center gap-6 text-sm mb-10"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-full bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10"
          >
            <Check className="w-4 h-4 text-emerald-500" />
            <span><strong className="text-gray-900 dark:text-white">Community</strong> — Free & open source</span>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-full bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span><strong className="text-gray-900 dark:text-white">Premium</strong> — Full offline + AI features</span>
          </motion.div>
        </motion.div>

        {/* CTA buttons - UPDATED with Live Codex button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
        >
          {/* Primary CTA - Explore Live Codex */}
          <Link
            href="/codex"
            className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/35 hover:-translate-y-0.5 transition-all overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <Play className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Explore Live Codex</span>
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="relative z-10"
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
          </Link>

          {/* Secondary CTAs */}
          <div className="flex gap-3">
            <Link
              href="https://github.com/framersai/codex"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 hover:-translate-y-0.5 transition-all"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:-translate-y-0.5 transition-all"
            >
              <span>Pricing</span>
            </Link>
          </div>
        </motion.div>

        {/* Stats row with staggered animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="flex flex-wrap justify-center gap-8 md:gap-12 text-center"
        >
          {[
            { value: 'Instant', label: 'Local Search' },
            { value: '100%', label: 'Offline' },
            { value: 'MIT', label: 'Licensed' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="cursor-default"
            >
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator with pulsing animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
      >
        <Link
          href="#fabric"
          className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-emerald-500 transition-colors"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-6 h-6" />
            </motion.div>
          </motion.div>
        </Link>
      </motion.div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FABRIC ARCHITECTURE SECTION
   Nested visualization showing Fabric > Weave > Loom > Strand hierarchy
   ═══════════════════════════════════════════════════════════════════════════════ */

const fabricLevels = [
  {
    id: 'fabric',
    name: 'FABRIC',
    subtitle: 'The Complete Corpus',
    description: 'Your entire knowledge base unified. The Fabric encompasses all domains, topics, and atomic knowledge units in a single traversable graph.',
    details: [
      'Unified namespace across all content',
      'Global semantic search & embeddings',
      'Cross-domain relationship discovery',
      'Your personal knowledge library'
    ],
    color: 'emerald',
    icon: Globe,
  },
  {
    id: 'weave',
    name: 'WEAVE',
    subtitle: 'Self-Contained Domains',
    description: 'Independent universes of knowledge. Each Weave is a complete domain that can be published, forked, or composed with other Weaves.',
    details: [
      'Domain isolation with clear boundaries',
      'Version-controlled via Git',
      'Composable with other Weaves',
      'Custom theming & branding'
    ],
    color: 'teal',
    icon: Layers,
  },
  {
    id: 'loom',
    name: 'LOOM',
    subtitle: 'Curated Modules',
    description: 'Organized collections within a Weave. Looms group related Strands into learnable, navigable modules with defined learning paths.',
    details: [
      'Topic-focused organization',
      'Learning path definitions',
      'Module-level metadata',
      'Hierarchical navigation'
    ],
    color: 'cyan',
    icon: Network,
  },
  {
    id: 'strand',
    name: 'STRAND',
    subtitle: 'Atomic Knowledge Units',
    description: 'The smallest unit of knowledge. Each Strand is a single concept with rich metadata, typed relationships, and smart organization.',
    details: [
      'OpenStrand Protocol metadata',
      'Automatic content understanding',
      'Typed semantic relationships',
      'Auto-generated connections'
    ],
    color: 'sky',
    icon: FileText,
  },
]

export function FabricSection() {
  const [activeLevel, setActiveLevel] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} id="fabric" className="py-24 px-4 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            The <span className="text-emerald-500">Fabric</span> of Knowledge
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            A four-tier hierarchy designed for intuitive organization and effortless navigation.
            Hover over each level to understand how knowledge flows.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Nested visualization */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Fabric - outermost */}
              <motion.div
                className={`absolute inset-0 rounded-3xl border-2 transition-all duration-300 ${
                  activeLevel === 'fabric' || !activeLevel
                    ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_60px_rgba(16,185,129,0.15)]'
                    : 'border-emerald-500/20 bg-emerald-500/2'
                }`}
                onMouseEnter={() => setActiveLevel('fabric')}
                onMouseLeave={() => setActiveLevel(null)}
              >
                <span className="absolute top-4 left-4 text-xs font-bold text-emerald-500 uppercase tracking-wider">Fabric</span>
              </motion.div>

              {/* Weave */}
              <motion.div
                className={`absolute inset-[12%] rounded-2xl border-2 transition-all duration-300 ${
                  activeLevel === 'weave'
                    ? 'border-teal-500 bg-teal-500/5 shadow-[0_0_40px_rgba(20,184,166,0.15)]'
                    : 'border-teal-500/20 bg-teal-500/2'
                }`}
                onMouseEnter={() => setActiveLevel('weave')}
                onMouseLeave={() => setActiveLevel(null)}
              >
                <span className="absolute top-3 left-3 text-xs font-bold text-teal-500 uppercase tracking-wider">Weave</span>
              </motion.div>

              {/* Loom */}
              <motion.div
                className={`absolute inset-[24%] rounded-xl border-2 transition-all duration-300 ${
                  activeLevel === 'loom'
                    ? 'border-cyan-500 bg-cyan-500/5 shadow-[0_0_30px_rgba(6,182,212,0.15)]'
                    : 'border-cyan-500/20 bg-cyan-500/2'
                }`}
                onMouseEnter={() => setActiveLevel('loom')}
                onMouseLeave={() => setActiveLevel(null)}
              >
                <span className="absolute top-2 left-2 text-xs font-bold text-cyan-500 uppercase tracking-wider">Loom</span>
              </motion.div>

              {/* Strand - innermost */}
              <motion.div
                className={`absolute inset-[36%] rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${
                  activeLevel === 'strand'
                    ? 'border-sky-500 bg-sky-500/10 shadow-[0_0_20px_rgba(14,165,233,0.2)]'
                    : 'border-sky-500/20 bg-sky-500/5'
                }`}
                onMouseEnter={() => setActiveLevel('strand')}
                onMouseLeave={() => setActiveLevel(null)}
              >
                <div className="text-center p-4">
                  <FileText className="w-8 h-8 text-sky-500 mx-auto mb-2" />
                  <span className="text-xs font-bold text-sky-500 uppercase tracking-wider">Strand</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Level cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            {fabricLevels.map((level, i) => {
              const Icon = level.icon
              const isActive = activeLevel === level.id
              const colorClasses = {
                emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-500' },
                teal: { border: 'border-teal-500', bg: 'bg-teal-500', text: 'text-teal-500' },
                cyan: { border: 'border-cyan-500', bg: 'bg-cyan-500', text: 'text-cyan-500' },
                sky: { border: 'border-sky-500', bg: 'bg-sky-500', text: 'text-sky-500' },
              }[level.color]!

              return (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                  onMouseEnter={() => setActiveLevel(level.id)}
                  onMouseLeave={() => setActiveLevel(null)}
                  className={`
                    relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-visible
                    ${isActive 
                      ? `${colorClasses.border} bg-white dark:bg-gray-900 shadow-lg z-20` 
                      : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${isActive ? colorClasses.bg + '/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? colorClasses.text : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold ${isActive ? colorClasses.text : 'text-gray-900 dark:text-white'}`}>
                          {level.name}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">— {level.subtitle}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {level.description}
                      </p>
                      
                      {/* Expanded details on hover - absolutely positioned to prevent layout shift */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`absolute left-0 right-0 top-full mt-2 p-4 rounded-xl border-2 bg-white dark:bg-gray-900 shadow-lg z-30 ${colorClasses.border}`}
                          >
                            <ul className="space-y-1.5">
                              {level.details.map((detail, j) => (
                                <li key={j} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <Check className={`w-3.5 h-3.5 ${colorClasses.text}`} />
                                  {detail}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SCHEMA SECTION
   OpenStrand Protocol visualization
   ═══════════════════════════════════════════════════════════════════════════════ */

export function SchemaSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const codeExample = `# OpenStrand Protocol Example
id: "550e8400-e29b-41d4-a716"
slug: "introduction-to-react"
version: "1.0.0"

# Content Settings
display:
  tone: "educational"
  detail: "comprehensive"
  navigation:
    traversal: "depth-first"
    citations: "always-source"

# Semantic Relationships
relationships:
  - target: "javascript-basics"
    type: "requires"
  - target: "react-hooks"
    type: "extends"`

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Code preview */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden bg-gray-900 dark:bg-black shadow-2xl border border-gray-800">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="ml-2 text-xs text-gray-400 font-mono">strand.yml</span>
              </div>
              <pre className="p-6 text-sm font-mono overflow-x-auto">
                <code className="text-gray-300">
                  {codeExample.split('\n').map((line, i) => (
                    <div key={i} className="leading-relaxed">
                      {line.startsWith('#') ? (
                        <span className="text-gray-500">{line}</span>
                      ) : line.includes(':') ? (
                        <>
                          <span className="text-cyan-400">{line.split(':')[0]}:</span>
                          <span className="text-emerald-400">{line.split(':').slice(1).join(':')}</span>
                        </>
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </motion.div>

          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Understands <span className="text-cyan-500">Your Content</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Every Strand is born with the OpenStrand Protocol—a universal schema that makes your content searchable and connected.
              Natural language queries with sourced citations, semantic search by meaning not keywords, and intelligent traversal of your knowledge graph—all running locally via WebAssembly.
            </p>

            <div className="space-y-4">
              {[
                { icon: Brain, title: 'Smart Metadata', desc: 'Rich metadata that helps organize, search, and present your knowledge. Control tone and detail level.' },
                { icon: Link2, title: 'Typed Relationships', desc: 'Beyond hyperlinks. Define semantic connections like "requires", "extends", or "contradicts".' },
                { icon: GitBranch, title: 'Version Controlled', desc: 'Every change tracked. Full history, branching, and collaborative editing via Git.' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <Icon className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   OFFLINE SECTION
   Local-first architecture
   ═══════════════════════════════════════════════════════════════════════════════ */

export function OfflineSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  // Get actual counts from GitHub tree
  const { totalStrands, totalWeaves, totalLooms, loading } = useGithubTree()

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            {/* Terminal mockup */}
            <div className="rounded-2xl overflow-hidden bg-gray-900 dark:bg-black shadow-2xl border border-gray-800">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                <Terminal className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-mono">terminal</span>
              </div>
              <div className="p-6 font-mono text-sm">
                <div className="mb-3">
                  <span className="text-emerald-400">➜</span> <span className="text-cyan-400">~</span> codex query "authentication patterns"
                </div>
                <div className="mb-3 text-gray-400">
                  <div className="flex items-center gap-2 mb-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      ⚡
                    </motion.span>
                    Indexing Fabric...
                  </div>
                  <div className="ml-4 text-gray-500 text-xs">
                    {loading ? (
                      <>Found looms & strands...</>
                    ) : (
                      <>Found {totalWeaves} weaves • {totalLooms} looms • {totalStrands.toLocaleString()} strands</>
                    )}<br/>
                    Generated embeddings (2.1MB)
                  </div>
                </div>
                <div className="text-gray-300">
                  <span className="text-emerald-400">✔</span> Results found locally:<br/><br/>
                  <span className="text-cyan-400">1.</span> JWT-based authentication <span className="text-gray-500">(auth/jwt-patterns)</span><br/>
                  <span className="text-cyan-400">2.</span> Session management <span className="text-gray-500">(auth/session-handling)</span><br/>
                  <span className="text-cyan-400">3.</span> OAuth2 integration <span className="text-gray-500">(auth/oauth-providers)</span>
                </div>
                <div className="mt-3">
                  <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>Offline First</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Your Second Brain.<br/>
              <span className="text-gray-400 dark:text-gray-500">No Internet Required.</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              FABRIC Codex runs entirely in your browser or terminal. Embeddings, semantic search, 
              and graph traversal happen locally via WebAssembly and WebGPU.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-emerald-500 mb-1">Instant</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Local Search</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-cyan-500 mb-1">100%</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Local & Private</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FEATURES GRID
   ═══════════════════════════════════════════════════════════════════════════════ */

const features = [
  { icon: Sparkles, title: 'RAG Search', desc: 'AI-powered search with answer synthesis. Get Perplexity-style answers with citations.', color: 'cyan' },
  { icon: PenTool, title: 'Writing Assistant', desc: 'Inline AI suggestions while you write. Tab to accept, Esc to dismiss.', color: 'emerald' },
  { icon: Eye, title: 'Vision AI & Auto-Captions', desc: 'Auto-analyze images with AI captions, screenshot detection, EXIF extraction, and object recognition.', color: 'violet' },
  { icon: Hash, title: 'Supertags', desc: 'Tana-inspired structured tags with typed fields. Turn any block into structured data.', color: 'pink' },
  { icon: Link2, title: 'Block Transclusion', desc: 'Reference, embed, cite, or mirror blocks across documents. Full backlink support.', color: 'blue' },
  { icon: Filter, title: 'Advanced Query', desc: 'Powerful query language with boolean operators, field filters, and saved queries.', color: 'purple' },
  { icon: Brain, title: 'AI Q&A', desc: 'Ask questions and get answers from your notes with context-aware responses.', color: 'teal' },
  { icon: Search, title: 'Semantic Search', desc: 'Find by meaning, not just keywords. Powered by local embeddings.', color: 'amber' },
  { icon: Network, title: 'Knowledge Graph', desc: 'Visualize connections between ideas in an interactive 3D graph.', color: 'cyan' },
  { icon: ImageIcon, title: 'Handwriting OCR', desc: 'Convert handwritten notes to text using local TrOCR or cloud AI with high accuracy.', color: 'violet' },
  { icon: Cpu, title: '5 LLM Providers', desc: 'Claude, GPT, OpenRouter, Mistral & Ollama. BYOK or run 100% local.', color: 'emerald' },
  { icon: Shield, title: 'Open Source', desc: 'MIT licensed. Your data stays yours. Forever.', color: 'teal' },
]

export function FeaturesGridSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    violet: 'bg-violet-500/10 text-violet-500',
    blue: 'bg-blue-500/10 text-blue-500',
    teal: 'bg-teal-500/10 text-teal-500',
    amber: 'bg-amber-500/10 text-amber-500',
    pink: 'bg-pink-500/10 text-pink-500',
    purple: 'bg-purple-500/10 text-purple-500',
  }

  return (
    <section ref={sectionRef} id="features" className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            A complete toolkit for building and navigating your personal knowledge universe.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl ${colorMap[feature.color]} mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   USE CASES SECTION
   ═══════════════════════════════════════════════════════════════════════════════ */

const useCases = [
  {
    icon: Users,
    title: 'For Teams',
    subtitle: 'Collaborative Knowledge Base',
    description: 'Build a shared source of truth across your organization. AI-powered search helps everyone find answers instantly.',
    image: '/images/placeholder-team.png',
    features: ['Shared workspaces', 'Permission controls', 'Activity feeds', 'Real-time sync']
  },
  {
    icon: GraduationCap,
    title: 'For Learners',
    subtitle: 'Personal Study System',
    description: 'Create flashcards, track progress, and build lasting knowledge with spaced repetition and AI tutoring.',
    image: '/images/placeholder-learning.png',
    features: ['FSRS flashcards', 'Progress tracking', 'AI tutoring', 'Mind maps']
  },
  {
    icon: Code2,
    title: 'For Developers',
    subtitle: 'Documentation Platform',
    description: 'Write docs in Markdown, get semantic search for free. AI agents can traverse and answer questions about your codebase.',
    image: '/images/placeholder-dev.png',
    features: ['Code highlighting', 'API docs', 'Search index', 'MCP integration']
  },
  {
    icon: Building2,
    title: 'For Enterprises',
    subtitle: 'AI-Ready Knowledge',
    description: 'Prepare your institutional knowledge for the AI era. OpenStrand protocol ensures your content works with any AI system.',
    image: '/images/placeholder-enterprise.png',
    features: ['Self-hosted', 'SSO/SAML', 'Audit logs', 'Custom LLMs']
  },
]

export function UseCasesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [activeCase, setActiveCase] = useState(0)

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Built for Everyone
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            From personal notes to enterprise documentation, FABRIC Codex scales with your needs.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Tabs */}
          <div className="lg:col-span-4 space-y-3">
            {useCases.map((uc, i) => {
              const Icon = uc.icon
              const isActive = activeCase === i
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveCase(i)}
                  className={`
                    w-full text-left p-4 rounded-xl border-2 transition-all duration-300
                    ${isActive 
                      ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`font-semibold ${isActive ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                        {uc.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{uc.subtitle}</div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Content */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCase}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800"
              >
                {/* Placeholder for screenshot/video */}
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Demo video coming soon</p>
                  </div>
                  {/* Overlay badge */}
                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                    Interactive Demo
                  </div>
                </div>

                {/* Description */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {useCases[activeCase].subtitle}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {useCases[activeCase].description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {useCases[activeCase].features.map((f, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FEATURE COMPARISON MATRIX - Community vs Premium Edition
   ═══════════════════════════════════════════════════════════════════════════════ */

export function FeatureMatrixSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const editions = ['Community', 'Premium']
  const featureRows = [
    { name: 'Semantic Search', community: true, premium: true, category: 'core' },
    { name: 'Knowledge Graph', community: true, premium: true, category: 'core' },
    { name: 'All 6 Themes', community: true, premium: true, category: 'core' },
    { name: 'Bookmarks & Reading Progress', community: true, premium: true, category: 'core' },
    { name: 'GitHub Integration', community: true, premium: true, category: 'core' },
    { name: 'Notetaking & Tagging', community: true, premium: true, category: 'core' },
    { name: 'Block-Level Tagging', community: true, premium: true, category: 'blocks' },
    { name: 'Supertags (Structured Tags)', community: true, premium: true, category: 'blocks' },
    { name: 'Block Transclusion & Backlinks', community: true, premium: true, category: 'blocks' },
    { name: 'Advanced Query System', community: true, premium: true, category: 'blocks' },
    { name: 'Custom Supertag Schemas', community: false, premium: true, category: 'blocks' },
    { name: 'AI Q&A with Citations', community: false, premium: true, category: 'ai' },
    { name: 'Quiz Generation', community: false, premium: true, category: 'ai' },
    { name: 'Flashcards (FSRS)', community: false, premium: true, category: 'ai' },
    { name: 'Image & Podcast Generation', community: false, premium: true, category: 'ai' },
    { name: 'Full Offline SQLite Storage', community: false, premium: true, category: 'offline' },
    { name: 'Works Without GitHub Repo', community: false, premium: true, category: 'offline' },
    { name: 'ZIP Export/Import', community: false, premium: true, category: 'offline' },
    { name: 'Desktop & Mobile Apps', community: false, premium: true, category: 'offline' },
  ]

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Edition <span className="text-emerald-500">Comparison</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Community Edition is free forever. Premium unlocks AI features and full offline capability.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 font-semibold text-gray-500 dark:text-gray-400">Feature</th>
                {editions.map((e, i) => (
                  <th
                    key={e}
                    className={`p-4 font-semibold text-center ${i === 1 ? 'text-emerald-500 bg-emerald-500/5' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <div>{e}</div>
                    <div className="text-xs font-normal mt-1">
                      {i === 0 ? 'Free' : '$149 one-time'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Core Features Header */}
              <tr className="bg-gray-100 dark:bg-gray-700/50">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Core Features
                </td>
              </tr>
              {featureRows.filter(r => r.category === 'core').map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                  <td className="p-4 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                  <td className="p-4 text-center bg-emerald-500/5">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
              ))}

              {/* Block-Level Features Header */}
              <tr className="bg-gray-100 dark:bg-gray-700/50">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Block-Level Features
                </td>
              </tr>
              {featureRows.filter(r => r.category === 'blocks').map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                  <td className="p-4 text-center">
                    {row.community ? (
                      <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center bg-emerald-500/5">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
              ))}

              {/* AI Features Header */}
              <tr className="bg-gray-100 dark:bg-gray-700/50">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  AI Features
                </td>
              </tr>
              {featureRows.filter(r => r.category === 'ai').map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                  <td className="p-4 text-center">
                    <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                  </td>
                  <td className="p-4 text-center bg-emerald-500/5">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
              ))}

              {/* Offline Features Header */}
              <tr className="bg-gray-100 dark:bg-gray-700/50">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Offline & Export
                </td>
              </tr>
              {featureRows.filter(r => r.category === 'offline').map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                  <td className="p-4 text-center">
                    <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                  </td>
                  <td className="p-4 text-center bg-emerald-500/5">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* CTA under table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="https://github.com/framersai/codex"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            <Github className="w-5 h-5" />
            Get Community (Free)
          </Link>
          <Link
            href={GUMROAD_PRODUCT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Get Premium ($149)
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NLP PIPELINE SECTION
   ═══════════════════════════════════════════════════════════════════════════════ */

export function NLPPipelineSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const steps = [
    { step: 1, title: 'Ingestion', desc: 'Parse Markdown with gray-matter, remark-gfm', icon: FileText, color: 'emerald' },
    { step: 2, title: 'NLP Analysis', desc: 'Extract keywords, entities via compromise.js', icon: Brain, color: 'cyan' },
    { step: 3, title: 'Embeddings', desc: 'Generate vectors via ONNX Runtime WebGPU', icon: Cpu, color: 'violet' },
    { step: 4, title: 'Index & Cache', desc: 'Store in IndexedDB for instant offline search', icon: Database, color: 'amber' },
  ]

  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500 text-emerald-500',
    cyan: 'border-cyan-500 text-cyan-500',
    violet: 'border-violet-500 text-violet-500',
    amber: 'border-amber-500 text-amber-500',
  }

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            The <span className="text-cyan-500">Intelligence</span> Pipeline
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Static NLP first, LLM assistance when needed. All running locally in your browser.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500 via-cyan-500 to-amber-500 hidden md:block" />

          <div className="space-y-8 md:space-y-0">
            {steps.map((s, i) => {
              const Icon = s.icon
              const isEven = i % 2 === 0
              return (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.15 }}
                  className={`relative flex items-center md:gap-8 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  {/* Step number */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 z-10">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 bg-white dark:bg-gray-900 ${colorMap[s.color]}`}>
                      {s.step}
                    </div>
                  </div>

                  {/* Card */}
                  <div className={`flex-1 md:w-[45%] ${isEven ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className={`inline-flex items-center gap-3 mb-3 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                        <div className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${colorMap[s.color]}`}>
                          {s.step}
                        </div>
                        <Icon className={`w-6 h-6 ${colorMap[s.color].split(' ')[1]}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{s.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{s.desc}</p>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="hidden md:block flex-1 md:w-[45%]" />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   GITHUB REPOS SECTION
   ═══════════════════════════════════════════════════════════════════════════════ */

export function GitHubReposSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const repos = [
    { name: 'codex', desc: 'Main content repository with weaves, looms, and strands.', stars: '★', color: 'emerald' },
    { name: 'frame.dev', desc: 'Next.js 14 app with offline PWA support.', stars: '★', color: 'cyan' },
    { name: 'openstrand', desc: 'The universal knowledge schema protocol.', stars: '★', color: 'violet' },
  ]

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Open <span className="text-violet-500">Source</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Fork, extend, self-host—it's all yours. MIT licensed.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {repos.map((repo, i) => (
            <motion.a
              key={repo.name}
              href={`https://github.com/framersai/${repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <Github className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                <span className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  {repo.name}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{repo.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">framersai/{repo.name}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.a>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center"
        >
          <Link
            href="/codex/architecture"
            className="inline-flex items-center gap-2 text-emerald-500 font-medium hover:text-emerald-600 transition-colors"
          >
            <Layers className="w-5 h-5" />
            <span>View Full Architecture Guide</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PRICING SECTION
   ═══════════════════════════════════════════════════════════════════════════════ */

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const plans = [
    {
      name: 'Community Edition',
      badge: 'Open Source',
      price: 'Free',
      period: 'forever',
      description: 'Self-host your knowledge base. Markdown files as source of truth.',
      features: [
        'Full semantic search & knowledge graph',
        'All 6 themes included',
        'Notetaking & metadata tagging',
        'Bookmarks & reading progress',
        'GitHub repository integration',
        'MIT licensed - yours forever',
      ],
      limitations: [
        'No AI Q&A/Quiz generation',
        'Requires GitHub repository',
      ],
      cta: 'Download Free',
      href: 'https://github.com/framersai/codex',
      highlighted: false,
    },
    {
      name: 'Premium Edition',
      badge: 'Full Power',
      price: '$149',
      launchPrice: '$49',
      launchBadge: 'Launch price coming soon',
      period: 'one-time',
      description: 'Full offline power. No GitHub required. All AI features.',
      features: [
        'Everything in Community',
        'AI Q&A with citations',
        'Quiz & flashcard generation (FSRS)',
        'Full offline SQLite storage',
        'Works without GitHub repo',
        'ZIP export/import',
        'Desktop & mobile apps',
      ],
      cta: 'Get Premium',
      href: GUMROAD_PRODUCT_URL,
      highlighted: true,
      external: true,
    },
  ]

  return (
    <section ref={sectionRef} id="pricing" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your <span className="text-emerald-500">Edition</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Start free with our open-source Community Edition. Upgrade to Premium for full offline power and AI features.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              className={`
                relative p-8 rounded-2xl border-2 transition-all
                ${plan.highlighted
                  ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }
              `}
            >
              {/* Badge */}
              <div className="absolute -top-3 left-6">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  plan.highlighted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {plan.badge}
                </span>
              </div>

              {/* Launch price badge for Premium */}
              {'launchBadge' in plan && plan.launchBadge && (
                <div className="absolute -top-3 right-6">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                    {plan.launchBadge}
                  </span>
                </div>
              )}

              <div className="mb-6 pt-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-emerald-500">{plan.price}</span>
                  {'launchPrice' in plan && plan.launchPrice && (
                    <span className="text-lg text-amber-500 font-semibold line-through opacity-60">{plan.launchPrice}</span>
                  )}
                  <span className="text-gray-500 dark:text-gray-400">/{plan.period}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Limitations */}
              {'limitations' in plan && plan.limitations && plan.limitations.length > 0 && (
                <ul className="space-y-2 mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {plan.limitations.map((l, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                      <X className="w-4 h-4 flex-shrink-0" />
                      {l}
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href={plan.href}
                target={'external' in plan && plan.external ? '_blank' : undefined}
                rel={'external' in plan && plan.external ? 'noopener noreferrer' : undefined}
                className={`
                  block w-full py-3 rounded-xl text-center font-semibold transition-all
                  ${plan.highlighted
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Enterprise callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400">
            Need team features or enterprise deployment?{' '}
            <Link href="mailto:enterprise@frame.dev" className="text-emerald-500 hover:text-emerald-600 font-medium">
              Contact us
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════════════════════════════ */

export function FinalCTASection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="py-32 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
        >
          Ready to build your<br />
          <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
            knowledge universe?
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-xl mx-auto"
        >
          Start with our free open-source Community Edition, or unlock everything with Premium.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="https://github.com/framersai/codex"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-semibold text-lg border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 hover:-translate-y-0.5 transition-all"
          >
            <Github className="w-5 h-5" />
            <span>Community (Free)</span>
          </Link>
          <Link
            href={GUMROAD_PRODUCT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            <span>Premium ($149)</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4 }}
          className="mt-8 text-sm text-gray-500 dark:text-gray-400"
        >
          Community: MIT Licensed • GitHub Required • Core Features<br />
          Premium: Full Offline • No GitHub Needed • All AI Features
        </motion.p>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DIVIDER
   ═══════════════════════════════════════════════════════════════════════════════ */

export function Divider() {
  return <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
}
