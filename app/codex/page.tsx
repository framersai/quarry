'use client'

import { Suspense } from 'react'
import FrameCodexViewer from '@/components/quarry-codex-viewer'

/**
 * Codex Homepage
 *
 * Goes directly to the Codex viewer.
 * Landing page is at /quarry.
 */
export default function CodexPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading Codex...</div>}>
      <FrameCodexViewer isOpen mode="page" />
    </Suspense>
  )
}
