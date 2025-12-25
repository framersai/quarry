import type { Metadata } from 'next'

/**
 * Codex Layout
 * Applies to all /codex/* routes
 * - Sets Quarry favicon for codex routes
 * - Provides shared metadata with Quarry Codex branding
 * - Quarry Codex is the official public digital garden by Frame.dev
 */
export const metadata: Metadata = {
  title: {
    template: '%s – Quarry Codex by Frame.dev',
    default: 'Quarry Codex - Free Open Source Digital Garden & Knowledge Base',
  },
  description: 'Quarry Codex by Frame.dev - The free, open-source digital garden and knowledge base viewer. AI-native personal knowledge management with semantic search, knowledge graphs, and LLM integration. Explore the official Quarry Codex public digital garden.',
  keywords: [
    // Primary Quarry Codex Keywords
    'Quarry Codex',
    'Quarry digital garden',
    'Quarry knowledge base',
    'Quarry by Frame.dev',
    'Quarry Codex viewer',
    // General PKM Keywords
    'digital garden',
    'knowledge base',
    'personal knowledge management',
    'PKM',
    'PKMS',
    'second brain',
    'markdown viewer',
    'knowledge graph',
    // Technical Features
    'semantic search',
    'AI notes',
    'OpenStrand',
    'weaves strands looms',
    // Free/Open Source
    'free digital garden',
    'open source knowledge base',
    'MIT licensed',
    // Frame.dev Brand
    'Frame.dev',
    'Quarry',
    'Quarry notes',
  ],
  icons: {
    icon: [
      { url: '/quarry-icon-mono-light.svg', media: '(prefers-color-scheme: light)' },
      { url: '/quarry-icon-mono-dark.svg', media: '(prefers-color-scheme: dark)' },
    ],
    shortcut: '/quarry-icon-mono-light.svg',
    apple: '/quarry-icon-mono-light.svg',
  },
  openGraph: {
    siteName: 'Quarry Codex by Frame.dev',
    title: 'Quarry Codex - Free Open Source Digital Garden',
    description: 'Explore Quarry Codex - the official public digital garden by Frame.dev. Free, open-source knowledge base with semantic search and AI-native features.',
    images: ['/og-codex.png'],
    type: 'website',
    url: 'https://frame.dev/codex',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quarry Codex - Free Digital Garden by Frame.dev',
    description: 'Explore Quarry Codex - the official public digital garden. Free, open-source knowledge base with semantic search.',
    creator: '@framersai',
    images: ['/og-codex.png'],
  },
  alternates: {
    canonical: 'https://frame.dev/codex',
  },
}

export default function CodexLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

