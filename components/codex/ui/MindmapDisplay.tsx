/**
 * Mindmap Display Component
 * @module components/codex/ui/MindmapDisplay
 *
 * Conditional rendering of mindmap viewers based on type
 * Handles loading, error, and empty states
 */

'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, GitBranch, Network as NetworkIcon, Brain, Loader2 } from 'lucide-react'

import type {
  MindmapType,
  HierarchyData,
  GraphData,
  ConceptData,
} from '@/hooks/useMindmapGeneration'

// Existing viewers
import MarkmapViewer from './MarkmapViewer'
import GraphViewer from './GraphViewer'
import ConceptMapViewer from './ConceptMapViewer'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export interface MindmapDisplayProps {
  mindmapType: MindmapType
  hierarchyData: HierarchyData | null
  graphData: GraphData | null
  conceptData: ConceptData | null
  loading: boolean
  progress: number
  error: string | null
  isDark?: boolean
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING STATE
═══════════════════════════════════════════════════════════════════════════ */

function LoadingState({
  mindmapType,
  progress,
  isDark,
}: {
  mindmapType: MindmapType
  progress: number
  isDark: boolean
}) {
  const icon = useMemo(() => {
    switch (mindmapType) {
      case 'hierarchy':
        return GitBranch
      case 'graph':
        return NetworkIcon
      case 'concept':
        return Brain
    }
  }, [mindmapType])

  const Icon = icon

  const label = useMemo(() => {
    switch (mindmapType) {
      case 'hierarchy':
        return 'Generating Hierarchy Mindmap'
      case 'graph':
        return 'Building Knowledge Graph'
      case 'concept':
        return 'Extracting Concepts'
    }
  }, [mindmapType])

  return (
    <div
      className={`flex flex-col items-center justify-center p-12 rounded-xl ${
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
      }`}
      style={{ minHeight: '400px' }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Icon
          className={`w-12 h-12 mb-4 ${
            isDark ? 'text-cyan-400' : 'text-cyan-600'
          }`}
        />
      </motion.div>

      <p
        className={`text-sm font-medium mb-2 ${
          isDark ? 'text-zinc-200' : 'text-zinc-700'
        }`}
      >
        {label}
      </p>

      <div className="w-64 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <p
        className={`text-xs mt-2 ${
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        }`}
      >
        {progress}%
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR STATE
═══════════════════════════════════════════════════════════════════════════ */

function ErrorState({
  error,
  isDark,
}: {
  error: string
  isDark: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 rounded-xl ${
        isDark ? 'bg-red-900/10 border border-red-800/30' : 'bg-red-50 border border-red-200'
      }`}
      style={{ minHeight: '400px' }}
    >
      <AlertCircle
        className={`w-12 h-12 mb-4 ${
          isDark ? 'text-red-400' : 'text-red-600'
        }`}
      />

      <p
        className={`text-sm font-medium mb-2 ${
          isDark ? 'text-red-200' : 'text-red-700'
        }`}
      >
        Generation Failed
      </p>

      <p
        className={`text-xs max-w-md text-center ${
          isDark ? 'text-red-300' : 'text-red-600'
        }`}
      >
        {error}
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════════════════════ */

function EmptyState({
  mindmapType,
  isDark,
}: {
  mindmapType: MindmapType
  isDark: boolean
}) {
  const message = useMemo(() => {
    switch (mindmapType) {
      case 'hierarchy':
        return 'No headings found in the content. Add H1-H6 headings to generate a hierarchy mindmap.'
      case 'graph':
        return 'No relationships found. Add prerequisites, related strands, or internal links to generate a knowledge graph.'
      case 'concept':
        return 'No concepts extracted. The content may be too short or lack identifiable concepts.'
    }
  }, [mindmapType])

  const icon = useMemo(() => {
    switch (mindmapType) {
      case 'hierarchy':
        return GitBranch
      case 'graph':
        return NetworkIcon
      case 'concept':
        return Brain
    }
  }, [mindmapType])

  const Icon = icon

  return (
    <div
      className={`flex flex-col items-center justify-center p-12 rounded-xl ${
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
      }`}
      style={{ minHeight: '400px' }}
    >
      <Icon
        className={`w-12 h-12 mb-4 ${
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        }`}
      />

      <p
        className={`text-sm font-medium mb-2 ${
          isDark ? 'text-zinc-300' : 'text-zinc-600'
        }`}
      >
        No Data Available
      </p>

      <p
        className={`text-xs max-w-md text-center ${
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        }`}
      >
        {message}
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function MindmapDisplay({
  mindmapType,
  hierarchyData,
  graphData,
  conceptData,
  loading,
  progress,
  error,
  isDark = false,
  className = '',
}: MindmapDisplayProps) {
  // Show loading state
  if (loading) {
    return <LoadingState mindmapType={mindmapType} progress={progress} isDark={isDark} />
  }

  // Show error state
  if (error) {
    return <ErrorState error={error} isDark={isDark} />
  }

  // Render based on mindmap type
  switch (mindmapType) {
    case 'hierarchy': {
      if (!hierarchyData || hierarchyData.headingCount === 0) {
        return <EmptyState mindmapType="hierarchy" isDark={isDark} />
      }

      return (
        <div className={`w-full ${className}`}>
          <MarkmapViewer
            markdown={hierarchyData.markdown}
            theme={isDark ? 'dark' : 'light'}
            height={600}
          />
        </div>
      )
    }

    case 'graph': {
      if (!graphData || graphData.nodes.length === 0) {
        return <EmptyState mindmapType="graph" isDark={isDark} />
      }

      return (
        <div className={`w-full ${className}`}>
          <GraphViewer
            graphData={graphData}
            isDark={isDark}
            height={600}
          />
        </div>
      )
    }

    case 'concept': {
      if (!conceptData || conceptData.nodes.length === 0) {
        return <EmptyState mindmapType="concept" isDark={isDark} />
      }

      return (
        <div className={`w-full ${className}`}>
          <ConceptMapViewer
            conceptData={conceptData}
            isDark={isDark}
            height={600}
          />
        </div>
      )
    }
  }
}
