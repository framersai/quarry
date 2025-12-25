/**
 * Hook for fetching and building the GitHub repository tree
 * @module codex/hooks/useGithubTree
 */

import { useState, useEffect, useCallback } from 'react'
import type { GitTreeItem, KnowledgeTreeNode } from '../types'
import { buildKnowledgeTree } from '../utils'
import { REPO_CONFIG } from '../constants'
import { fetchGithubTree, fetchGithubTreeREST, hasGithubAuthToken } from '@/lib/githubGraphql'

let graphQlWarningLogged = false
let restWarningLogged = false

interface UseGithubTreeResult {
  tree: KnowledgeTreeNode[]
  loading: boolean
  error: string | null
  totalStrands: number
  totalWeaves: number
  totalLooms: number
  graphqlAvailable: boolean
  resolvedBranch: string
  refetch: () => Promise<void>
}

export function useGithubTree(): UseGithubTreeResult {
  const [tree, setTree] = useState<KnowledgeTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalStrands, setTotalStrands] = useState(0)
  const [totalWeaves, setTotalWeaves] = useState(0)
  const [totalLooms, setTotalLooms] = useState(0)
  const [graphqlAvailable, setGraphqlAvailable] = useState(true)
  const [resolvedBranch, setResolvedBranch] = useState(REPO_CONFIG.BRANCH)

  const fetchTree = useCallback(async () => {
    // Check sessionStorage to see if we already failed GraphQL recently
    // to prevent re-render loops
    const graphqlFailed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('codex-graphql-failed') === 'true'
    
    setLoading(true)
    setError(null)

    try {
      let rawEntries: Array<{ name: string; type: string; path: string; size?: number }> = []
      const patAvailable = hasGithubAuthToken()

      const branchCandidates = Array.from(new Set(['master', 'main', REPO_CONFIG.BRANCH].filter(Boolean)))
      let fetchSucceeded = false
      let lastError: unknown = null

      for (const branch of branchCandidates) {
        // Skip GraphQL attempt if marked as failed in this session
        if (!graphqlFailed && patAvailable) {
          try {
            rawEntries = await fetchGithubTree(REPO_CONFIG.OWNER, REPO_CONFIG.NAME, branch)
            if (REPO_CONFIG.BRANCH !== branch) {
              REPO_CONFIG.BRANCH = branch
            }
            if (resolvedBranch !== branch) {
              setResolvedBranch(branch)
            }
            setGraphqlAvailable(true)
            fetchSucceeded = true
            break
          } catch (graphqlError) {
            if (!graphQlWarningLogged) {
              console.warn('Codex GitHub GraphQL unavailable, switching to REST.', graphqlError)
              graphQlWarningLogged = true
            }
            setGraphqlAvailable(false)
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('codex-graphql-failed', 'true')
            }
          }
        } else {
          setGraphqlAvailable(false)
        }

        // REST Fallback
        try {
          rawEntries = await fetchGithubTreeREST(REPO_CONFIG.OWNER, REPO_CONFIG.NAME, branch)
          if (REPO_CONFIG.BRANCH !== branch) {
            REPO_CONFIG.BRANCH = branch
          }
          if (resolvedBranch !== branch) {
            setResolvedBranch(branch)
          }
          fetchSucceeded = true
          break
        } catch (restError) {
          lastError = restError
          if (!restWarningLogged) {
            console.warn('Codex GitHub REST fallback failed, trying next branch.', restError)
            restWarningLogged = true
          }
        }
      }

      if (!fetchSucceeded) {
        throw lastError ?? new Error('Unable to fetch repository tree from GitHub.')
      }

      const items: GitTreeItem[] = rawEntries.map((entry) => ({
        path: entry.path,
        mode: entry.type === 'blob' ? '100644' : '040000',
        type: entry.type as 'blob' | 'tree',
        sha: '',
        size: entry.size,
        url: '',
      }))

      // Count looms from raw items BEFORE tree pruning removes empty directories
      // A loom is any directory at depth 3+ inside weaves/ (e.g., weaves/wiki/tutorials/)
      const loomPaths = new Set<string>()
      items.forEach(item => {
        if (item.type !== 'blob') return
        const segments = item.path.split('/')
        if (segments[0] !== 'weaves' || segments.length < 4) return
        // Collect all unique loom-level directories (depth 3+)
        // Skip 'looms' and 'strands' organizational folders
        for (let i = 3; i < segments.length; i++) {
          const dirName = segments[i - 1]
          if (dirName === 'looms' || dirName === 'strands') continue
          const loomPath = segments.slice(0, i).join('/')
          loomPaths.add(loomPath)
        }
      })
      const looms = loomPaths.size

      const builtTree = buildKnowledgeTree(items)

      // Only count strands within the weaves/ folder (the fabric codex hierarchy)
      const weavesFolder = builtTree.find(node => node.name === 'weaves' && node.type === 'dir')
      const strands = weavesFolder?.strandCount ?? 0

      const weaveNodes = weavesFolder?.children?.filter(child => child.type === 'dir' && child.level === 'weave') || []
      const weaves = weaveNodes.length

      setTree(builtTree)
      setTotalStrands(strands)
      setTotalWeaves(weaves)
      setTotalLooms(looms)
    } catch (err) {
      console.error('Failed to fetch GitHub tree:', err)
      setError(err instanceof Error ? err.message : 'Failed to load knowledge tree')
      setTree([])
      setTotalStrands(0)
      setTotalWeaves(0)
      setTotalLooms(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

  return {
    tree,
    loading,
    error,
    totalStrands,
    totalWeaves,
    totalLooms,
    graphqlAvailable,
    resolvedBranch,
    refetch: fetchTree,
  }
}
