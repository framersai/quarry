/**
 * New Strand Creation Page
 * @module codex/new
 * 
 * @description
 * Full-featured strand creation with file upload, URL scraping,
 * and automatic metadata extraction.
 * 
 * @remarks
 * Now uses CodexPageLayout for consistent sidebar/navigation.
 */

'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import CodexPageLayout from '@/components/codex/CodexPageLayout'
import { CodexTreeView } from '@/components/codex/tree'
import { useGithubTree } from '@/components/codex/hooks/useGithubTree'

// Dynamic import to avoid SSR issues with client-side NLP
const StrandCreatorClient = dynamic(
  () => import('./StrandCreatorClient'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading creator...</p>
        </div>
      </div>
    )
  }
)

// Metadata needs to be moved to a layout or handled differently in 'use client'
// For now we'll rely on CodexPageLayout's title prop

function NewStrandContent() {
  const router = useRouter()
  const { theme: systemTheme } = useTheme()
  const isDark = systemTheme?.includes('dark')
  
  // Knowledge Tree for Sidebar
  const { tree, loading: treeLoading } = useGithubTree()

  return (
    <CodexPageLayout
      title="Create New Strand"
      description="Write, upload, or import content with automatic tagging"
      leftPanelContent={
        <CodexTreeView
          data={tree}
          loading={treeLoading}
          onNavigate={(path) => router.push(`/codex/${path.replace(/\.md$/, '')}`)}
          isDark={isDark}
          enableDragDrop={false}
        />
      }
    >
      <StrandCreatorClient />
    </CodexPageLayout>
  )
}

export default function NewStrandPage() {
  return (
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">Loading creator...</p>
          </div>
        </div>
      }>
      <NewStrandContent />
      </Suspense>
  )
}
