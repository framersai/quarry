/**
 * Catch-all route for clean Codex URLs
 * @module app/codex/[...path]/page
 * 
 * @remarks
 * Maps clean URLs to Codex content:
 * - /codex/weaves/frame/openstrand → weaves/frame/openstrand folder
 * - /codex/weaves/frame/openstrand/architecture → architecture.md file
 * 
 * This enables SEO-friendly URLs instead of query params.
 * SEO and indexing respects strand/weave schema settings:
 * - seo.index: false → noindex
 * - seo.follow: false → nofollow
 * - noindex: true (legacy) → noindex
 */

import { Metadata } from 'next'
import { Suspense } from 'react'
import FrameCodexViewer from '@/components/quarry-codex-viewer'
import { generateCodexMetadata } from '@/lib/seo'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ path: string[] }>
}

interface StrandIndexEntry {
  path: string
  metadata?: {
    title?: string
    summary?: string
    tags?: string[]
    featured?: boolean
    seo?: {
      index?: boolean
      follow?: boolean
      canonicalUrl?: string
      metaDescription?: string
      ogImage?: string
      sitemapPriority?: number
    }
    noindex?: boolean
  }
}

/**
 * Fetch strand metadata from the codex index
 */
async function fetchStrandMetadata(filePath: string): Promise<StrandIndexEntry | null> {
  try {
    // Try to fetch from codex-index.json
    const indexUrl = process.env.NEXT_PUBLIC_CODEX_INDEX_URL || 
      'https://raw.githubusercontent.com/framersai/codex/master/codex-index.json'
    
    const response = await fetch(indexUrl, { 
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!response.ok) return null
    
    const index: StrandIndexEntry[] = await response.json()
    
    // Find the matching entry - try with and without .md extension
    const entry = index.find(e => 
      e.path === filePath || 
      e.path === `${filePath}.md` ||
      e.path === filePath.replace(/\.md$/, '')
    )
    
    return entry || null
  } catch {
    return null
  }
}

/**
 * Generate metadata for the page based on the path
 * Respects strand SEO settings for indexing control
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params
  const fullPath = path.join('/')
  const fileName = path[path.length - 1]
  const potentialFilePath = fullPath.endsWith('.md') ? fullPath : `${fullPath}.md`
  
  // Try to fetch actual strand metadata
  const strandData = await fetchStrandMetadata(potentialFilePath)
  
  const title = strandData?.metadata?.title || fileName
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Codex'
  
  const description = strandData?.metadata?.summary || 
    strandData?.metadata?.seo?.metaDescription ||
    `View ${fullPath} in the FABRIC Codex knowledge repository.`
  
  // Determine type from path
  const type = fullPath.includes('/looms/') ? 'loom' 
    : fullPath.startsWith('weaves/') && path.length === 2 ? 'weave'
    : 'strand'
  
  return generateCodexMetadata({
    title,
    description,
    path: fullPath,
    tags: strandData?.metadata?.tags,
    type,
    seo: strandData?.metadata?.seo,
    noindex: strandData?.metadata?.noindex,
  })
}

/**
 * Helper: Add essential parent paths (up to depth 2)
 * Avoids creating deep directory trees for memory efficiency
 */
function addPathAndParents(filePath: string, pathSet: Set<string>): void {
  const cleanPath = filePath.replace(/\.md$/, '')
  pathSet.add(cleanPath)

  // Only add parent directories up to depth 2 (weaves/looms, not individual strands)
  const parts = filePath.split('/')
  if (parts.length >= 2) {
    pathSet.add(parts[0])  // Root (e.g., "weaves")
    if (parts.length >= 3) {
      pathSet.add(parts.slice(0, 2).join('/'))  // Weave (e.g., "weaves/frame")
    }
  }
}

/**
 * Fallback paths when index fetch fails
 */
function getFallbackPaths(): { path: string[] }[] {
  return [
    { path: ['weaves'] },
    { path: ['docs'] },
    { path: ['wiki'] },
  ]
}

/**
 * Generate static params using priority-based filtering
 *
 * Optimization: Instead of generating ALL ~10,000 paths (causing OOM),
 * only pre-render high-priority pages (~200) for SEO and performance.
 * Other pages load dynamically via client-side routing.
 *
 * Tier System:
 * - Tier 1: sitemapPriority >= 0.8 OR featured === true (~50-100 pages)
 * - Tier 2: sitemapPriority >= 0.5 OR seo.index === true (~50-100 pages)
 * - Always: Directory structures up to depth 2 (~50-100 pages)
 * - Runtime: Everything else loads client-side (~2000+ pages)
 *
 * Required for Next.js static export
 */
export async function generateStaticParams(): Promise<{ path: string[] }[]> {
  try {
    const indexUrl = process.env.NEXT_PUBLIC_CODEX_INDEX_URL ||
      'https://raw.githubusercontent.com/framersai/codex/master/codex-index.json'

    const response = await fetch(indexUrl, { cache: 'no-store' })

    if (!response.ok) {
      console.warn('Failed to fetch codex index for static params, status:', response.status)
      return getFallbackPaths()
    }

    const index: StrandIndexEntry[] = await response.json()
    const priorityPaths = new Set<string>()

    // Configuration: Can be overridden via environment variables
    const mode = process.env.NEXT_PUBLIC_STATIC_GEN_MODE || 'priority'
    const minPriority = parseFloat(process.env.NEXT_PUBLIC_MIN_PRIORITY || '0.5')

    // Always add root directories
    priorityPaths.add('weaves')
    priorityPaths.add('docs')
    priorityPaths.add('wiki')

    // Mode: 'all' (old behavior), 'priority' (optimized), or 'minimal' (roots only)
    if (mode === 'all') {
      // Fallback to old behavior if needed (generates all paths)
      index.forEach(entry => {
        if (entry.path) {
          const cleanPath = entry.path.replace(/\.md$/, '')
          priorityPaths.add(cleanPath)

          const parts = entry.path.split('/')
          for (let i = 1; i < parts.length; i++) {
            const dir = parts.slice(0, i).join('/')
            priorityPaths.add(dir)
          }
        }
      })
    } else if (mode === 'minimal') {
      // Only root directories (fastest build, for testing)
      // Already added above
    } else {
      // Default: 'priority' mode - smart filtering
      index.forEach(entry => {
        if (!entry.path) return

        const priority = entry.metadata?.seo?.sitemapPriority ?? 0
        const featured = entry.metadata?.featured ?? false
        const isIndexable = entry.metadata?.seo?.index !== false && !entry.metadata?.noindex
        const depth = entry.path.split('/').length

        // Tier 1: High priority or featured content
        if (priority >= 0.8 || featured) {
          addPathAndParents(entry.path, priorityPaths)
        }
        // Tier 2: Medium priority or indexable content
        else if (priority >= minPriority || isIndexable) {
          addPathAndParents(entry.path, priorityPaths)
        }
        // Tier 3: Always include shallow directory structures (weaves/looms)
        else if (depth <= 2) {
          addPathAndParents(entry.path, priorityPaths)
        }
        // Everything else: Load via client-side routing (not pre-rendered)
      })
    }

    // Convert to params array
    const params = Array.from(priorityPaths).map(p => ({
      path: p.split('/')
    }))

    console.log(`[generateStaticParams] Mode: ${mode}, Generated ${params.length} paths (total index: ${index.length})`)

    return params
  } catch (error) {
    console.error('Error generating static params:', error)
    return getFallbackPaths()
  }
}

/**
 * Determine if path points to a file or directory
 * Files end with known extensions or are treated as .md
 */
function parseCodexPath(pathSegments: string[]): { 
  directoryPath: string
  filePath: string | null 
} {
  if (!pathSegments || pathSegments.length === 0) {
    return { directoryPath: '', filePath: null }
  }

  const fullPath = pathSegments.join('/')
  const lastSegment = pathSegments[pathSegments.length - 1]
  
  // Check if last segment looks like a file (has extension or is a known pattern)
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment)
  
  if (hasExtension) {
    // It's explicitly a file with extension
    const dirSegments = pathSegments.slice(0, -1)
    return {
      directoryPath: dirSegments.join('/'),
      filePath: fullPath,
    }
  }
  
  // Check if this could be a markdown file (no extension = assume .md)
  // We'll pass both the directory and potential file path
  // The viewer will determine which exists
  return {
    directoryPath: fullPath,
    filePath: `${fullPath}.md`, // Try as .md file first
  }
}

export default async function CodexPathPage({ params }: PageProps) {
  const { path } = await params
  
  // Validate path starts with valid root
  const validRoots = ['weaves', 'docs', 'wiki', 'schema']
  if (!path || path.length === 0 || !validRoots.includes(path[0])) {
    notFound()
  }
  
  const { directoryPath, filePath } = parseCodexPath(path)
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">Loading Codex…</p>
        </div>
      </div>
    }>
      <FrameCodexViewer 
        isOpen 
        mode="page" 
        initialPath={directoryPath}
        initialFile={filePath}
      />
    </Suspense>
  )
}
