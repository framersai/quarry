# Quarry Codex Canvas System

> Infinite canvas with custom shapes for voice notes, transcripts, and attachments

## Overview

The Quarry Codex Canvas System extends [tldraw](https://tldraw.com) with custom interactive shapes for knowledge capture. Quarry Codex is our official public digital garden. It provides:

- **VoiceNoteShape** - Audio player with waveform visualization
- **TranscriptShape** - Editable text cards linked to voice notes
- **AttachmentShape** - File/image embeds with previews
- **Smart Export** - Convert canvas content to structured markdown strands

## Quick Start

### Basic Usage

```tsx
import WhiteboardCanvas from '@/components/codex/ui/WhiteboardCanvas'

function MyComponent() {
  const [canvasOpen, setCanvasOpen] = useState(false)

  return (
    <WhiteboardCanvas
      isOpen={canvasOpen}
      onClose={() => setCanvasOpen(false)}
      onSave={(svg, png) => {
        // Handle exported drawing
        console.log('Saved:', svg)
      }}
      theme="dark"
    />
  )
}
```

### With Canvas Export

```tsx
import { useCanvasExport } from '@/components/codex/hooks/useCanvasExport'
import CanvasExportModal from '@/components/codex/ui/CanvasExportModal'

function MyComponent() {
  const { exportModal, openExportModal, handleExport } = useCanvasExport({
    onExportComplete: (result) => {
      // Save the strand
      saveStrand(result.markdown, result.frontmatter)
      // Save assets
      result.assets.forEach(asset => saveAsset(asset))
    }
  })

  return (
    <>
      <button onClick={openExportModal}>Export Canvas</button>
      <CanvasExportModal {...exportModal} />
    </>
  )
}
```

---

## Custom Shapes

### VoiceNoteShape

Audio player with waveform visualization and transcription support.

```typescript
interface VoiceNoteShapeProps {
  w: number                    // Width (default: 400)
  h: number                    // Height (default: 120)
  audioPath: string            // Path to audio file
  duration: number             // Duration in seconds
  currentTime: number          // Playback position
  isPlaying: boolean           // Playback state
  waveformData: number[]       // Normalized waveform (0-1)
  transcriptText: string       // Inline transcript preview
  linkedTranscriptId: string   // Link to TranscriptShape
  recordedAt: string           // ISO timestamp
  title: string                // User-editable title
  transcriptionStatus: TranscriptionStatus
}

type TranscriptionStatus =
  | 'idle'       // Not transcribed
  | 'pending'    // Queued
  | 'processing' // In progress
  | 'done'       // Complete
  | 'error'      // Failed
  | 'cancelled'  // User cancelled
```

**Features:**
- Play/pause/seek controls
- Waveform visualization with progress indicator
- Click-to-seek on waveform
- Transcription status with cancel option
- Link to transcript navigation

### TranscriptShape

Editable text card for transcripts and notes.

```typescript
interface TranscriptShapeProps {
  w: number                      // Width (default: 300)
  h: number                      // Height (auto-grows)
  title: string                  // Header title
  text: string                   // Transcript content
  linkedVoiceNoteId: string      // Link to VoiceNoteShape
  tags: string[]                 // Hashtags
  timestamps: TranscriptTimestamp[]  // Audio sync points
  color: string                  // Card theme color
  createdAt: string              // ISO timestamp
}
```

**Features:**
- Auto-resize based on content
- Tag pills with click-to-filter
- Timestamp sync with voice notes
- Markdown support in text
- "Jump to audio" link

### AttachmentShape

File and image embeds with previews.

```typescript
interface AttachmentShapeProps {
  w: number                    // Width (default: 200)
  h: number                    // Height (default: 200)
  fileName: string             // Display name
  filePath: string             // Path in assets/
  mimeType: string             // Content type
  fileSize: number             // Size in bytes
  thumbnailPath: string        // Preview image
  dimensions: MediaDimensions | null  // For images/videos
  uploadedAt: string           // ISO timestamp
}
```

**Features:**
- Thumbnail preview for images
- File icon for documents
- Download button
- File size display
- Drag-drop from desktop

---

## Hooks

### useCanvasShapes

Create and manage custom shapes on the canvas.

```tsx
import { useCanvasShapes } from './canvas/useCanvasShapes'

function CanvasComponent({ editor }) {
  const {
    createVoiceNote,
    createTranscript,
    createAttachment,
    createVoiceNoteWithTranscript,
  } = useCanvasShapes({ editor })

  // Create a voice note at cursor position
  const handleRecording = async (blob, path) => {
    await createVoiceNote({
      audioPath: path,
      audioBlob: blob,
      title: 'My Recording',
      duration: 30,
      autoTranscribe: true,
      position: { x: 100, y: 100 },
    })
  }
}
```

### useCanvasExport

Manage canvas export workflow.

```tsx
import { useCanvasExport } from '@/components/codex/hooks/useCanvasExport'

function ExportButton({ editor }) {
  const {
    isExporting,
    exportResult,
    exportError,
    startExport,
    resetExport,
  } = useCanvasExport({
    editor,
    onExportComplete: (result) => console.log('Exported:', result),
  })

  return (
    <button onClick={startExport} disabled={isExporting}>
      {isExporting ? 'Exporting...' : 'Export'}
    </button>
  )
}
```

### useHaptics

Provide haptic feedback on touch devices.

```tsx
import { useHaptics } from '@/components/codex/hooks/useHaptics'

function TouchButton() {
  const { haptic, canVibrate } = useHaptics()

  return (
    <button onClick={() => {
      haptic('medium')  // 50ms vibration
      // do action
    }}>
      Tap me
    </button>
  )
}
```

**Haptic Patterns:**
- `light` - 10ms (button taps)
- `medium` - 50ms (standard feedback)
- `heavy` - 100ms (confirmations)
- `success` - [50, 30, 50] (double pulse)
- `error` - [100, 50, 100, 50, 100] (triple pulse)
- `selection` - 30ms (menu items)
- `longPress` - 80ms (context menus)

---

## Export Utilities

### canvasToMarkdown

Convert canvas shapes to structured markdown.

```tsx
import { canvasToMarkdown, canvasHasContent } from './canvas/canvasToMarkdown'

// Check if canvas has exportable content
if (canvasHasContent(editor)) {
  const result = await canvasToMarkdown(editor, {
    title: 'My Canvas Notes',
    tags: ['canvas', 'voice-notes'],
    includeDrawings: true,
    groupBy: 'type',
  })

  console.log(result.markdown)      // Generated markdown
  console.log(result.frontmatter)   // YAML frontmatter object
  console.log(result.assets)        // Files to save
  console.log(result.metadata)      // Export statistics
}
```

**Export Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | 'Canvas Export' | Strand title |
| `tags` | string[] | ['canvas', 'export'] | Strand tags |
| `includeDrawings` | boolean | true | Export drawings as SVG |
| `groupBy` | 'type' \| 'position' | 'type' | Content organization |
| `includeLinkedAudio` | boolean | true | Include linked audio with transcripts |

**Shape-to-Markdown Mapping:**

| Shape | Markdown Output |
|-------|----------------|
| VoiceNoteShape | `## Title` + `<audio>` + transcript |
| TranscriptShape | `## Title` + blockquote + tags |
| AttachmentShape (image) | `![alt](path)` |
| AttachmentShape (file) | `**[filename](path)**` |
| Drawing shapes | Exported SVG embedded as image |

---

## Mobile Touch Support

### Long-Press Context Menu

The canvas supports long-press (500ms) to open the radial menu on touch devices.

```tsx
// Already integrated in WhiteboardCanvas
<div
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  onTouchCancel={handleTouchEnd}
>
  <Tldraw ... />
</div>
```

**Behavior:**
- 500ms hold triggers menu
- 10px movement cancels
- Haptic feedback on activation

### Touch Target Utilities

CSS utilities for touch-friendly interfaces:

```css
/* In globals.css */
.touch-target     { min-height: 44px; min-width: 44px; }
.touch-target-lg  { min-height: 48px; min-width: 48px; }
.touch-target-xl  { min-height: 56px; min-width: 56px; }

.touch-button     { /* 44px + padding + no-select */ }
.touch-button-lg  { /* 48px + padding + no-select */ }

.pb-safe          { padding-bottom: env(safe-area-inset-bottom); }
.pt-safe          { padding-top: env(safe-area-inset-top); }
```

### MobileCanvasToolbar

Bottom-positioned toolbar for touch devices.

```tsx
import MobileCanvasToolbar from './canvas/MobileCanvasToolbar'

<MobileCanvasToolbar
  editor={editor}
  activeTool="draw"
  canUndo={true}
  canRedo={false}
  onOpenVoice={() => setVoiceRecorderOpen(true)}
  onOpenCamera={() => setCameraOpen(true)}
  theme="dark"
  visible={isMobile}
/>
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+N` / `Ctrl+N` | Create new blank strand |
| `Cmd+Shift+N` / `Ctrl+Shift+N` | Open strand wizard |
| `Cmd+E` / `Ctrl+E` | Export canvas as strand |
| `Cmd+S` / `Ctrl+S` | Save/export drawing |

---

## Theme Colors

Shapes automatically adapt to light/dark themes:

```typescript
const SHAPE_THEME_COLORS = {
  voicenote: {
    light: { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444', text: '#991b1b' },
    dark:  { bg: '#450a0a', border: '#7f1d1d', accent: '#f87171', text: '#fecaca' },
  },
  transcript: {
    light: { bg: '#faf5ff', border: '#e9d5ff', accent: '#a855f7', text: '#6b21a8' },
    dark:  { bg: '#3b0764', border: '#6b21a8', accent: '#c084fc', text: '#e9d5ff' },
  },
  attachment: {
    light: { bg: '#f0fdf4', border: '#bbf7d0', accent: '#22c55e', text: '#166534' },
    dark:  { bg: '#052e16', border: '#166534', accent: '#4ade80', text: '#bbf7d0' },
  },
}
```

---

## Size Constraints

| Shape | Min | Default | Max |
|-------|-----|---------|-----|
| VoiceNote | 200×100 | 400×120 | 600×200 |
| Transcript | 200×100 | 300×200 | 500×∞ |
| Attachment | 150×150 | 200×200 | 400×400 |

---

## File Structure

```
components/codex/ui/canvas/
├── shapes/
│   ├── VoiceNoteShape/
│   │   ├── VoiceNoteShapeUtil.tsx   # Shape definition
│   │   ├── VoiceNoteComponent.tsx   # Interactive UI
│   │   └── WaveformCanvas.tsx       # Waveform visualization
│   ├── TranscriptShape/
│   │   ├── TranscriptShapeUtil.tsx
│   │   └── TranscriptComponent.tsx
│   ├── AttachmentShape/
│   │   ├── AttachmentShapeUtil.tsx
│   │   └── AttachmentComponent.tsx
│   ├── types.ts                     # Type definitions
│   └── index.ts                     # Exports
├── canvasToMarkdown.ts              # Export utility
├── MobileCanvasToolbar.tsx          # Touch toolbar
├── useCanvasShapes.ts               # Shape creation hook
└── README.md                        # This file

components/codex/hooks/
├── useHaptics.ts                    # Haptic feedback
├── useCanvasExport.ts               # Export workflow
├── useCodexHotkeys.ts               # Keyboard shortcuts
└── useIsTouchDevice.ts              # Touch detection

components/codex/ui/
├── WhiteboardCanvas.tsx             # Main canvas component
├── CanvasExportModal.tsx            # Export modal
├── QuickCreateFAB.tsx               # Quick create button
└── RadialMediaMenu.tsx              # Context menu
```

---

## Integration Example

Complete integration with a Codex viewer:

```tsx
import { useState, useCallback } from 'react'
import WhiteboardCanvas from '@/components/codex/ui/WhiteboardCanvas'
import CanvasExportModal from '@/components/codex/ui/CanvasExportModal'
import QuickCreateFAB from '@/components/codex/ui/QuickCreateFAB'
import { useCodexHotkeys } from '@/components/codex/hooks/useCodexHotkeys'
import { canvasHasContent } from '@/components/codex/ui/canvas/canvasToMarkdown'

function CodexViewer() {
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [editor, setEditor] = useState(null)

  // Keyboard shortcuts
  useCodexHotkeys({
    onNewBlank: () => router.push('/codex/new?mode=blank'),
    onNewWizard: () => router.push('/codex/new'),
    onExportCanvas: () => setExportOpen(true),
  })

  const handleExport = useCallback((result) => {
    // Save strand with generated markdown
    saveStrand({
      content: result.markdown,
      frontmatter: result.frontmatter,
    })

    // Save assets
    result.assets.forEach(async (asset) => {
      if (asset.blob) {
        await saveAsset(asset.path, asset.blob)
      }
    })
  }, [])

  return (
    <>
      {/* Quick Create FAB */}
      <QuickCreateFAB
        onNewBlank={() => router.push('/codex/new?mode=blank')}
        onFromCanvas={() => setExportOpen(true)}
        onFromTemplate={() => router.push('/codex/new')}
        canvasHasContent={editor ? canvasHasContent(editor) : false}
        theme="dark"
      />

      {/* Canvas */}
      <WhiteboardCanvas
        isOpen={canvasOpen}
        onClose={() => setCanvasOpen(false)}
        onSave={(svg) => console.log('Saved drawing')}
        theme="dark"
      />

      {/* Export Modal */}
      <CanvasExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        editor={editor}
        onExport={handleExport}
        theme="dark"
      />
    </>
  )
}
```

---

## Best Practices

### Performance

1. **Lazy load canvas** - Use `dynamic()` import for WhiteboardCanvas
2. **Memoize callbacks** - Use `useCallback` for shape creation handlers
3. **Debounce exports** - Don't export on every change

### Accessibility

1. **Touch targets** - Use `.touch-target` (44px min) on all buttons
2. **Keyboard navigation** - Support all shortcuts with Cmd/Ctrl variants
3. **Screen readers** - Add aria-labels to interactive elements

### Mobile

1. **Safe areas** - Use `.pb-safe` for bottom-positioned UI
2. **Haptics** - Call `haptic()` on significant interactions
3. **Large targets** - Use 48-56px buttons on touch devices

---

## Troubleshooting

### Canvas not loading

```tsx
// Ensure dynamic import for SSR
const WhiteboardCanvas = dynamic(
  () => import('./WhiteboardCanvas'),
  { ssr: false }
)
```

### Shapes not rendering

```tsx
// Register custom shape utils
<Tldraw
  shapeUtils={CUSTOM_SHAPE_UTILS}
  ...
/>
```

### Audio not playing

Check that audio files are served from correct path:
```
/strand-folder/assets/audio/voice-*.webm
```

### Export missing assets

Ensure blob data is available before export:
```tsx
// Assets with blobs need to be saved separately
result.assets.filter(a => a.blob).forEach(saveAsset)
```
