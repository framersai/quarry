/**
 * Full Fabric Knowledge Graph - Interactive visualization
 * @route /codex/graph
 * 
 * Full-screen interactive graph starting from the Fabric level,
 * allowing exploration of the entire knowledge base hierarchy.
 */

import { Metadata } from 'next'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with D3
const FullFabricGraph = dynamic(
  () => import('@/components/codex/ui/FullFabricGraph'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 animate-pulse" />
          <p className="text-zinc-400 text-sm">Loading Fabric Graph...</p>
        </div>
      </div>
    )
  }
)

export const metadata: Metadata = {
  title: 'Knowledge Graph | Quarry',
  description: 'Interactive visualization of the entire Quarry knowledge base - explore weaves, looms, and strands in a force-directed graph.',
  openGraph: {
    title: 'Knowledge Graph | Quarry',
    description: 'Interactive visualization of the entire Quarry knowledge base',
  },
}

export default function CodexGraphPage() {
  return <FullFabricGraph />
}











