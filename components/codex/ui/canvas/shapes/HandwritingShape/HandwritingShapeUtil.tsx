/**
 * Handwriting Shape Util
 * @module codex/ui/canvas/shapes/HandwritingShape
 *
 * Custom tldraw shape for handwritten notes with OCR transcription.
 * Features:
 * - Canvas drawing or image upload support
 * - Local OCR with TrOCR model
 * - Cloud fallback for low confidence
 * - Link to transcript shape
 */

'use client'

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  Rectangle2d,
  TLOnResizeHandler,
  TLHandle,
  type Geometry2d,
} from '@tldraw/tldraw'
import {
  type HandwritingShape,
  type HandwritingShapeProps,
  DEFAULT_SHAPE_PROPS,
  SHAPE_SIZE_CONSTRAINTS,
  clampShapeDimensions,
} from '../types'
import { HandwritingComponent } from './HandwritingComponent'

/**
 * Handwriting shape utility class
 */
export class HandwritingShapeUtil extends BaseBoxShapeUtil<HandwritingShape> {
  static override type = 'handwriting' as const

  // Shape behavior flags
  override canEdit = () => true
  override canResize = () => true
  override canUnmount = () => false // Keep OCR state
  override hideResizeHandles = () => false
  override isAspectRatioLocked = () => false
  override canBind = () => true

  /**
   * Default properties for new handwriting shapes
   */
  override getDefaultProps(): HandwritingShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.handwriting }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: HandwritingShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: HandwritingShape) {
    return <HandwritingComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: HandwritingShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="12" />
  }

  /**
   * Define connection handles for linking
   */
  override getHandles(shape: HandwritingShape): TLHandle[] {
    const { w, h } = shape.props
    return [
      {
        id: 'top',
        type: 'vertex',
        index: 'a1' as any,
        x: w / 2,
        y: 0,
      },
      {
        id: 'bottom',
        type: 'vertex',
        index: 'a2' as any,
        x: w / 2,
        y: h,
      },
      {
        id: 'left',
        type: 'vertex',
        index: 'a3' as any,
        x: 0,
        y: h / 2,
      },
      {
        id: 'right',
        type: 'vertex',
        index: 'a4' as any,
        x: w,
        y: h / 2,
      },
    ]
  }

  /**
   * Handle resize with constraints
   */
  override onResize: TLOnResizeHandler<HandwritingShape> = (shape, info) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('handwriting', newW, newH)

    return {
      ...shape,
      props: {
        ...shape.props,
        w,
        h,
      },
    }
  }

  /**
   * Handle double-click to edit title
   */
  override onDoubleClick = (shape: HandwritingShape) => {
    // Enter edit mode to change title
    return undefined
  }

  /**
   * Handle edit end - save any changes
   */
  override onEditEnd = (shape: HandwritingShape) => {
    console.log('Handwriting edit ended:', shape.id)
  }

  /**
   * Export shape as SVG (for saving)
   */
  override toSvg(shape: HandwritingShape) {
    const { w, h, title, localConfidence, previewText } = shape.props
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', w.toString())
    rect.setAttribute('height', h.toString())
    rect.setAttribute('rx', '12')
    rect.setAttribute('fill', '#eff6ff')
    rect.setAttribute('stroke', '#bfdbfe')
    rect.setAttribute('stroke-width', '2')
    g.appendChild(rect)

    // Title
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', '16')
    text.setAttribute('y', '24')
    text.setAttribute('font-size', '14')
    text.setAttribute('fill', '#1e40af')
    text.textContent = `✏️ ${title}`
    g.appendChild(text)

    // Confidence badge if available
    if (localConfidence !== undefined) {
      const confidenceText = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      )
      confidenceText.setAttribute('x', (w - 16).toString())
      confidenceText.setAttribute('y', '24')
      confidenceText.setAttribute('font-size', '12')
      confidenceText.setAttribute('fill', '#1e40af')
      confidenceText.setAttribute('text-anchor', 'end')
      confidenceText.textContent = `${Math.round(localConfidence * 100)}%`
      g.appendChild(confidenceText)
    }

    // Preview text (first line)
    if (previewText) {
      const previewLine = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      )
      previewLine.setAttribute('x', '16')
      previewLine.setAttribute('y', (h - 16).toString())
      previewLine.setAttribute('font-size', '11')
      previewLine.setAttribute('fill', '#1e40af')
      previewLine.setAttribute('opacity', '0.75')
      previewLine.textContent = previewText.slice(0, 50) + '...'
      g.appendChild(previewLine)
    }

    return g
  }
}
