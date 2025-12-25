/**
 * Spiral Path - Learning Pathway Visualization
 * @module codex/spiral-path
 * 
 * @description
 * Interactive learning path visualization with prerequisite chains,
 * skill level inputs, and multiple view modes (tree/graph).
 * 
 * Based on Jerome Bruner's Spiral Curriculum principle:
 * "Any subject can be taught effectively in some intellectually honest form
 * to any child at any stage of development."
 * 
 * @features
 * - Tree View: Hierarchical outline of learning paths
 * - Graph View: Force-directed visualization of prerequisites
 * - Skill Input: User's current knowledge for personalized paths
 * - Path Planner: Shortest path between any two strands
 * - Filters: By weave, tags, difficulty level
 * - Interactive: Hover legends, click navigation, zoom/pan
 * 
 * @see https://openstrand.ai/architecture
 */

import { Metadata } from 'next'
import { Suspense } from 'react'
import SpiralPathClient from './SpiralPathClient'

export const metadata: Metadata = {
  title: 'Spiral Path – Learning Pathway Visualization | Quarry',
  description: 'Visualize learning paths with prerequisite chains. Enter your skills, select a goal, and discover the optimal learning journey through the knowledge graph.',
  openGraph: {
    title: 'Spiral Path – Learning Pathway Visualization',
    description: 'Discover optimal learning paths through the FABRIC Codex knowledge graph.',
    images: ['/og/spiral-path.png'],
  },
}

// Loading fallback for Suspense boundary (required for useSearchParams)
function SpiralPathLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-500 dark:text-zinc-400">Loading Spiral Path...</p>
      </div>
    </div>
  )
}

export default function SpiralPathPage() {
  return (
    <Suspense fallback={<SpiralPathLoading />}>
      <SpiralPathClient />
    </Suspense>
  )
}







