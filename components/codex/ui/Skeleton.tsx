/**
 * Skeleton Loading Components
 * @module codex/ui/Skeleton
 * 
 * @remarks
 * Beautiful skeleton screens for loading states.
 * Reduces perceived latency compared to spinners.
 */

'use client'

import React from 'react'

interface SkeletonProps {
  /** Width */
  width?: string | number
  /** Height */
  height?: string | number
  /** Border radius */
  radius?: string
  /** Additional className */
  className?: string
}

/**
 * Base skeleton element
 */
export function Skeleton({ width, height = '1rem', radius = '0.25rem', className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-800 ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width || '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radius,
      }}
    />
  )
}

/**
 * Skeleton for file list item
 */
export function FileListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton width={16} height={16} radius="0.25rem" />
          <Skeleton width={`${60 + Math.random() * 40}%`} height={14} />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for metadata panel
 */
export function MetadataPanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton width={20} height={20} radius="50%" />
        <Skeleton width="40%" height={16} />
      </div>
      
      {/* Stats */}
      <div className="space-y-2">
        <Skeleton width="100%" height={60} radius="0.5rem" />
      </div>
      
      {/* Sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="30%" height={12} />
          <Skeleton width="100%" height={40} radius="0.5rem" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for content area
 */
export function ContentSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Title */}
      <div className="space-y-3">
        <Skeleton width="70%" height={32} />
        <Skeleton width="40%" height={14} />
      </div>
      
      {/* Paragraphs */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="100%" height={12} />
          <Skeleton width="95%" height={12} />
          <Skeleton width="98%" height={12} />
          <Skeleton width="85%" height={12} />
        </div>
      ))}
      
      {/* Code block */}
      <Skeleton width="100%" height={120} radius="0.75rem" />
      
      {/* More paragraphs */}
      <div className="space-y-2">
        <Skeleton width="100%" height={12} />
        <Skeleton width="92%" height={12} />
      </div>
    </div>
  )
}

/**
 * Skeleton for knowledge tree
 */
export function KnowledgeTreeSkeleton() {
  return (
    <div className="space-y-3">
      {/* Stats card */}
      <Skeleton width="100%" height={80} radius="1rem" />
      
      {/* Tree nodes */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-3 px-3 py-3">
            <Skeleton width={16} height={16} radius="0.25rem" />
            <Skeleton width={`${50 + Math.random() * 30}%`} height={14} />
            <Skeleton width={24} height={18} radius="9999px" className="ml-auto" />
          </div>
          {/* Nested items */}
          {i % 2 === 0 && (
            <div className="pl-8 space-y-2">
              <div className="flex items-center gap-3 px-3 py-2">
                <Skeleton width={14} height={14} />
                <Skeleton width="60%" height={12} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

