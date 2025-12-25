/**
 * Confidence Badge Component
 * @module codex/ui/canvas/shapes/HandwritingShape/ConfidenceBadge
 *
 * Displays OCR confidence score with color-coded indicator
 */

import React from 'react'
import { CheckCircle } from 'lucide-react'

export interface ConfidenceBadgeProps {
  /**
   * Confidence score (0-1)
   */
  value: number
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Get confidence level and color based on score
 */
function getConfidenceLevel(confidence: number): {
  level: 'high' | 'medium' | 'low'
  label: string
  color: string
  bgColor: string
} {
  if (confidence >= 0.85) {
    return {
      level: 'high',
      label: 'High',
      color: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    }
  }

  if (confidence >= 0.60) {
    return {
      level: 'medium',
      label: 'Medium',
      color: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    }
  }

  return {
    level: 'low',
    label: 'Low',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
  }
}

/**
 * Confidence Badge Component
 *
 * Displays OCR confidence score with color coding:
 * - Green (≥85%): High confidence
 * - Yellow (60-84%): Medium confidence
 * - Red (<60%): Low confidence
 */
export function ConfidenceBadge({ value, size = 'md' }: ConfidenceBadgeProps) {
  const percentage = Math.round(value * 100)
  const { label, color, bgColor } = getConfidenceLevel(value)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${color} ${bgColor}`}
      title={`${percentage}% confidence (${label.toLowerCase()})`}
    >
      <CheckCircle className={iconSizes[size]} />
      <span>{percentage}%</span>
      <span className="font-normal opacity-75">{label}</span>
    </span>
  )
}
