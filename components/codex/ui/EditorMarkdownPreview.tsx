/**
 * Editor Markdown Preview - Isolated markdown rendering for StrandEditor
 * @module codex/ui/EditorMarkdownPreview
 *
 * @remarks
 * This component isolates markdown rendering to prevent TDZ errors in production builds.
 * Uses plain pre/code blocks instead of react-syntax-highlighter to avoid hydration issues.
 * Supports Mermaid diagrams with interactive rendering.
 */

'use client'

import React, { type ComponentPropsWithoutRef, memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import dynamic from 'next/dynamic'
import { remarkStripControlFlags } from '@/lib/remark/remarkStripControlFlags'
import { remarkAssetGallery } from '@/lib/remark/remarkAssetGallery'
import { stripFrontmatter } from '../utils'

// Dynamic import for InlineMermaid to avoid SSR issues
const InlineMermaid = dynamic(
  () => import('./MermaidDiagram').then(mod => ({ default: mod.InlineMermaid })),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse my-4">
        <div className="h-4 w-24 bg-zinc-300 dark:bg-zinc-700 rounded mb-2" />
        <div className="h-32 bg-zinc-200 dark:bg-zinc-600 rounded" />
      </div>
    )
  }
)

interface EditorMarkdownPreviewProps {
  content: string
  className?: string
}

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & {
  inline?: boolean
  node?: unknown
}

// Simple code block component without syntax highlighting
// Supports Mermaid diagrams with interactive rendering
const CodeBlock = memo(function CodeBlock({ node: _node, inline, className, children, style: _style, ...props }: MarkdownCodeProps) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const codeString = String(children).replace(/\n$/, '')

  // Render Mermaid diagrams with InlineMermaid component
  if (!inline && language === 'mermaid') {
    return <InlineMermaid code={codeString} />
  }

  return !inline && match ? (
    <pre
      style={{
        margin: 0,
        padding: '1rem',
        background: '#1e1e1e',
        borderRadius: '0.5rem',
        overflow: 'auto',
      }}
    >
      <code className={className} style={{ color: '#d4d4d4' }}>
        {codeString}
      </code>
    </pre>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  )
})

const MARKDOWN_COMPONENTS: Components = {
  code: CodeBlock as Components['code'],
}

export default function EditorMarkdownPreview({ content, className = '' }: EditorMarkdownPreviewProps) {
  // Strip YAML frontmatter from preview - it will be edited separately
  const contentWithoutFrontmatter = stripFrontmatter(content)

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkStripControlFlags, remarkAssetGallery]}
      rehypePlugins={[rehypeRaw]}
      components={MARKDOWN_COMPONENTS}
      className={className}
    >
      {contentWithoutFrontmatter}
    </ReactMarkdown>
  )
}
