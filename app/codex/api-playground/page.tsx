import { Metadata } from 'next'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const ApiPlayground = dynamic(
  () => import('@/components/codex/ui/ApiPlayground'),
  { ssr: false }
)

export const metadata: Metadata = {
  title: 'API Playground | Quarry',
  description: 'Interactive API testing interface for the Quarry REST API. Test endpoints, manage tokens, and explore the API with live examples.',
}

export default function ApiPlaygroundPage() {
  return (
    <div className="h-screen w-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-zinc-500">Loading API Playground...</p>
          </div>
        </div>
      }>
        <ApiPlayground />
      </Suspense>
    </div>
  )
}

