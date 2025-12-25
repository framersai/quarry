/**
 * Quarry Codex Viewer - Legacy export with providers wrapper
 * @deprecated Import from '@/components/codex' instead
 *
 * This file re-exports the new modular CodexViewer to maintain
 * backwards compatibility with existing imports.
 *
 * Wrapped with:
 * - ToastProvider for notifications
 * - InstanceConfigProvider for customizable instance naming
 */

'use client'

import React from 'react'
import CodexViewer from './codex/CodexViewer'
import { ToastProvider } from './codex/ui/Toast'
import { InstanceConfigProvider } from '@/lib/config'
import type { QuarryCodexViewerProps } from './codex/types'

export type { QuarryCodexViewerProps } from './codex/types'

/**
 * Wrapped CodexViewer with ToastProvider and InstanceConfigProvider
 */
export default function QuarryCodexViewerWithToast(props: QuarryCodexViewerProps) {
  return (
    <InstanceConfigProvider>
      <ToastProvider>
        <CodexViewer {...props} />
      </ToastProvider>
    </InstanceConfigProvider>
  )
}
