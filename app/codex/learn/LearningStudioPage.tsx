'use client'

/**
 * Learning Studio Page Client
 * @module codex/learn/LearningStudioPage
 *
 * Full-page learning experience with consistent CodexPageLayout navigation
 */

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import LearningStudio from '@/components/codex/ui/LearningStudio'
import { CodexTreeView } from '@/components/codex/tree'
import { useGithubTree } from '@/components/codex/hooks/useGithubTree'
import CodexPageLayout from '@/components/codex/CodexPageLayout'

export default function LearningStudioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const isDark = theme?.includes('dark')

  const [currentStrand, setCurrentStrand] = useState<string | undefined>(
    searchParams.get('strand') || undefined
  )
  const [strandContent, setStrandContent] = useState<string>('')
  const [isMounted, setIsMounted] = useState(false)

  // Knowledge Tree for Sidebar
  const { tree, loading: treeLoading } = useGithubTree()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch strand content if specified
  useEffect(() => {
    if (!currentStrand) return

    const fetchContent = async () => {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/OpenStrand/frame.codex/main/${currentStrand}`)
        if (res.ok) {
          setStrandContent(await res.text())
        }
      } catch (err) {
        console.warn('Failed to fetch strand content:', err)
      }
    }

    fetchContent()
  }, [currentStrand])

  const handleNavigate = (path: string) => {
    setCurrentStrand(path)
    // Update URL without navigation
    const url = new URL(window.location.href)
    url.searchParams.set('strand', path)
    window.history.pushState({}, '', url.toString())
  }

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <CodexPageLayout
      title="Learning Studio"
      description="Flashcards, quizzes, and AI-generated questions with spaced repetition"
      leftPanelContent={
        <CodexTreeView
          data={tree}
          loading={treeLoading}
          onNavigate={handleNavigate}
          isDark={isDark}
          enableDragDrop={false}
        />
      }
    >
      <div className="h-full overflow-hidden">
        <LearningStudio
          isOpen={true}
          onClose={() => router.push('/codex')}
          mode="page"
          strandSlug={currentStrand}
          content={strandContent}
          theme={theme || 'light'}
        />
      </div>
    </CodexPageLayout>
  )
}




















