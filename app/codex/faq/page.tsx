/**
 * Quarry FAQ Page
 * Frequently Asked Questions about Quarry by Frame.dev
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Sparkles,
  ExternalLink,
  HelpCircle,
  MessageSquare
} from 'lucide-react'
import QuarryNavigation from '@/components/codex/ui/QuarryNavigation'
import Footer from '@/components/footer'

// FAQ data organized by category
const faqCategories = [
  {
    name: 'Getting Started',
    questions: [
      {
        q: 'What is Quarry?',
        a: 'Quarry is an AI-native personal knowledge management system built by Frame.dev. It combines the simplicity of Markdown notes with advanced features like semantic search, knowledge graphs, and spaced repetition to help you organize and find your information more effectively. Core features work 100% offline with optional LLM enhancements.',
      },
      {
        q: 'Is Quarry free to use?',
        a: 'Yes! The Community Edition is completely free and open-source under the MIT License. It includes all core features: semantic search, knowledge graphs, bookmarks, and reading progress. Premium ($79, or $49 for students/launch) adds flashcards, quizzes, offline SQLite storage, and export features.',
      },
      {
        q: 'How do I get started with Quarry?',
        a: 'Simply visit the Quarry app and start exploring. You can browse the knowledge base, use semantic search, and view the knowledge graph immediately. For creating your own notes, connect a GitHub repository or use the Premium offline SQLite storage.',
      },
    ],
  },
  {
    name: 'Features & Functionality',
    questions: [
      {
        q: 'How does the AI-powered search work?',
        a: 'Quarry uses semantic search powered by advanced language models. Instead of just matching keywords, it understands the meaning of your query and finds relevant notes even if they don\'t contain the exact words you searched for. This makes it much easier to find information when you can\'t remember the exact phrasing.',
      },
      {
        q: 'What LLM providers are supported for AI features?',
        a: 'Quarry supports optional LLM-enhanced features with multiple providers: OpenAI (GPT-5.2), Anthropic Claude (Claude Opus 4.5, Sonnet 4.5), and local models via Ollama (Llama 3, Mistral, etc.). All LLM features are optional—core functionality including semantic search, NLP extraction, and flashcard generation works 100% offline using built-in static models. You can bring your own API keys or run completely locally with Ollama for full privacy.',
      },
      {
        q: 'What is the OpenStrand schema?',
        a: 'OpenStrand is the hierarchical knowledge organization protocol used in Quarry. It organizes information into four levels: Fabric (entire repository), Weaves (top-level domains), Looms (thematic folders), and Strands (individual markdown notes). This structure makes it easy to organize complex knowledge bases while maintaining flexibility for both human navigation and AI traversal.',
      },
      {
        q: 'Does Quarry work offline?',
        a: 'Yes! Quarry is 100% offline-first. All core features including semantic search, NLP extraction, and the knowledge graph work without an internet connection. Only optional LLM features (Q&A enhancement, advanced suggestions) require internet when using cloud providers—or run completely locally with Ollama.',
      },
      {
        q: 'Can I use Quarry on multiple devices?',
        a: 'Yes. With GitHub integration, your knowledge base syncs across devices via your repository. Premium users can also use offline SQLite storage with manual export/import for air-gapped environments.',
      },
    ],
  },
  {
    name: 'Privacy & Security',
    questions: [
      {
        q: 'Is my data private?',
        a: 'Your privacy is our priority. Notes are stored locally by default and processed client-side. When using LLMs, you control which provider to use—including local Ollama for complete privacy. Self-host Quarry for full control over your data.',
      },
      {
        q: 'Can I self-host Quarry?',
        a: 'Yes! Quarry is open source (MIT licensed) and designed for self-hosting. Deploy to GitHub Pages, Vercel, or any static host. For LLM features, use your own API keys or run Ollama locally for complete privacy. See our self-hosting guide for detailed instructions.',
      },
      {
        q: 'What happens to my data if I stop using Quarry?',
        a: 'Your notes are stored in standard Markdown files with YAML frontmatter—the same format used by Obsidian, Hugo, and other tools. Export anytime. No lock-in, no proprietary formats. Your data is always yours.',
      },
    ],
  },
  {
    name: 'Technical',
    questions: [
      {
        q: 'What file formats does Quarry support?',
        a: 'Quarry uses Markdown (.md) files with YAML frontmatter for metadata—following the OpenStrand protocol. Import from other note-taking apps, URLs, or plain text. Export to ZIP, PDF, or keep using your markdown files directly.',
      },
      {
        q: 'Can I integrate Quarry with other tools?',
        a: 'Yes! Quarry has a REST API for integration with other tools and AI agents. MCP (Model Context Protocol) support coming soon for direct integration with Claude and other AI assistants.',
      },
      {
        q: 'Is there a mobile app?',
        a: 'The web app is fully responsive and works great on mobile browsers. Native iOS and Android apps are on our roadmap for future releases.',
      },
    ],
  },
  {
    name: 'About Frame.dev',
    questions: [
      {
        q: 'Who builds Quarry?',
        a: 'Quarry is built by Frame.dev, focused on creating AI-native infrastructure for developers and knowledge workers. We\'re building open-source tools that help people organize knowledge for the AI era.',
      },
      {
        q: 'How can I contribute to Quarry?',
        a: 'Quarry is open source under MIT! Contribute code, report bugs, suggest features, or help with documentation on our GitHub repository. Join our Discord for community discussions.',
      },
    ],
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-lg font-medium text-gray-900 dark:text-white pr-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-600 dark:text-gray-400 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <QuarryNavigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
          <div className="text-center mb-16">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative w-32 h-16">
                <Image
                  src="/quarry-logo-light.svg"
                  alt="Quarry"
                  fill
                  className="object-contain block dark:hidden"
                />
                <Image
                  src="/quarry-logo-dark.svg"
                  alt="Quarry"
                  fill
                  className="object-contain hidden dark:block"
                />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to know about{' '}
              <span
                className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 text-transparent bg-clip-text"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}
              >
                Quarry
              </span>
            </p>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="container mx-auto px-4 pb-16 max-w-4xl">
          {faqCategories.map((category) => (
            <div key={category.name} className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-emerald-500" />
                {category.name}
              </h2>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl px-6 border border-gray-200 dark:border-gray-800">
                {category.questions.map((item, index) => (
                  <FAQItem key={index} question={item.q} answer={item.a} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* More Questions Section */}
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl p-8 md:p-12 text-center border border-emerald-200 dark:border-emerald-800">
              <MessageSquare className="w-12 h-12 text-emerald-500 mx-auto mb-6" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                Still have questions?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                Can't find what you're looking for? Join our Discord community or check out the Frame.dev FAQ for more information.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="https://discord.gg/VXXC4SJMKh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors shadow-md"
                >
                  <MessageSquare className="w-5 h-5" />
                  Join Discord
                </a>
                <a
                  href="https://frame.dev/faq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Frame.dev FAQ
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Try Quarry today and experience AI-native knowledge management.
          </p>
          <Link
            href="/codex"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
          >
            <Sparkles className="w-5 h-5" />
            <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Try Quarry</span>
          </Link>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}

