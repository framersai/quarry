/**
 * Activity Log Page - View audit logs, undo history, and session activity
 * @module codex/activity/page
 */

import { Suspense } from 'react'
import ActivityLogViewer from './ActivityLogViewer'

export const metadata = {
  title: 'Activity Log | Quarry',
  description: 'View your activity history, audit logs, and undo/redo stack',
}

export default function ActivityPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          <p className="text-zinc-500 dark:text-zinc-400">Loading activity log...</p>
        </div>
      </div>
    }>
      <ActivityLogViewer />
    </Suspense>
  )
}
