import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Quarry — AI Notes App | Knowledge Management by Frame.dev',
  description:
    'Quarry Codex is your AI-powered notes app and personal knowledge management system. The best Fabric notetaking app with offline-first design, semantic search, knowledge graphs, and AI integration. Built by Frame.dev.',
  keywords: [
    // Primary - Fabric branded
    'fabric notes',
    'fabric codex',
    'fabric ai notes',
    'fabric knowledge management',
    'fabric notetaking app',
    'fabric notes app',
    // Secondary - General
    'ai notetaking app',
    'ai notes app',
    'personal knowledge base',
    'second brain app',
    'offline notes app',
    'privacy-first notes',
    'open source notes app',
    'markdown notes app',
    'knowledge graph app',
    'ai-powered notes',
    // Competitor alternatives
    'best ai notes app 2025',
    'obsidian alternative',
    'notion alternative open source',
    'roam alternative',
    'private ai notes',
    // Technical
    'semantic search notes',
    'connected notes',
    'digital garden',
    'zettelkasten app',
    'pkms app',
    'personal knowledge management system',
    // Brand
    'fabric by frame',
    'frame.dev',
    'openstrand',
    'llm integration notes',
  ],
  openGraph: {
    title: 'Quarry — AI Notes App | by Frame.dev',
    description:
      'Quarry Codex is your AI-powered notes app and second brain. Offline-first, privacy-focused, open source personal knowledge management. Built by Frame.dev.',
    url: 'https://frame.dev/codex/landing',
    siteName: 'Quarry Codex by Frame.dev',
    type: 'website',
    images: ['/og-codex.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quarry — AI Notes App | by Frame.dev',
    description:
      'Quarry Codex: Your AI-powered notes app and second brain. Offline-first, privacy-focused, open source. Built by Frame.dev.',
    creator: '@framersai',
    images: ['/og-codex.png'],
  },
  alternates: {
    canonical: 'https://frame.dev/fabric',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function CodexLandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
