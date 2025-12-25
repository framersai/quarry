/**
 * Voice Recorder - Retro cassette tape UI
 * @module codex/ui/VoiceRecorder
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, Pause, Download, Loader2, Volume2 } from 'lucide-react'
import type { ThemeName } from '@/types/theme'

interface VoiceRecorderProps {
  /** Whether recorder is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Recording complete callback */
  onRecordingComplete: (blob: Blob, transcript?: string) => void
  /** Current theme */
  theme?: ThemeName
}

interface Recording {
  blob: Blob
  url: string
  duration: number
  timestamp: Date
}

/**
 * Retro cassette tape-styled voice recorder
 * 
 * @remarks
 * - Records audio as WebM using MediaRecorder API
 * - Animated cassette reels during recording
 * - VU meter visualization
 * - Optional transcription (TODO)
 * - Auto-saves to assets/audio/
 */
export default function VoiceRecorder({
  isOpen,
  onClose,
  onRecordingComplete,
  theme = 'light',
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recording, setRecording] = useState<Recording | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isDark = theme.includes('dark')

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [])

  /**
   * Visualize audio levels
   */
  const visualize = () => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
    setAudioLevel(average / 255)

    animationFrameRef.current = requestAnimationFrame(visualize)
  }

  /**
   * Start recording
   */
  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Setup audio analyser
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm'
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setRecording({
          blob,
          url,
          duration,
          timestamp: new Date(),
        })
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      startTimeRef.current = Date.now()
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)

      // Start visualization
      visualize()
    } catch (err) {
      console.error('Error starting recording:', err)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  /**
   * Stop recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }

  /**
   * Pause/resume recording
   */
  const togglePause = () => {
    if (!mediaRecorderRef.current) return

    if (isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
    } else {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
    }
  }

  /**
   * Format duration as MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!recording) return

    // TODO: Implement transcription
    setTranscribing(true)
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate transcription
    setTranscribing(false)

    onRecordingComplete(recording.blob)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Cassette Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`
            relative w-full max-w-md
            ${theme === 'sepia-light' ? 'bg-gradient-to-b from-amber-100 to-amber-50' : ''}
            ${theme === 'sepia-dark' ? 'bg-gradient-to-b from-gray-900 to-black' : ''}
            ${theme === 'dark' ? 'bg-gradient-to-b from-gray-900 to-gray-950' : ''}
            ${theme === 'light' ? 'bg-gradient-to-b from-gray-100 to-white' : ''}
            rounded-3xl shadow-2xl border-4
            ${isDark ? 'border-gray-800' : 'border-gray-300'}
            p-8
          `}
        >
          {/* Cassette Label */}
          <div className={`
            absolute inset-x-8 top-8 h-24
            ${isDark ? 'bg-red-900' : 'bg-red-600'}
            rounded-lg shadow-inner
            flex items-center justify-center
            border-2 ${isDark ? 'border-red-950' : 'border-red-700'}
          `}>
            <div className="text-white text-center">
              <p className="text-xs uppercase tracking-wider opacity-70">Voice Recording</p>
              <p className="text-lg font-bold">{formatDuration(duration)}</p>
            </div>
          </div>

          {/* Cassette Reels */}
          <div className="mt-32 mb-8 flex justify-between px-12">
            <motion.div
              animate={isRecording && !isPaused ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className={`
                w-20 h-20 rounded-full
                ${isDark ? 'bg-gray-800' : 'bg-gray-700'}
                shadow-inner relative
              `}
            >
              <div className="absolute inset-2 rounded-full bg-gray-900 shadow-inner">
                <div className="absolute inset-2 rounded-full border-4 border-gray-700" />
              </div>
            </motion.div>
            
            <motion.div
              animate={isRecording && !isPaused ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className={`
                w-20 h-20 rounded-full
                ${isDark ? 'bg-gray-800' : 'bg-gray-700'}
                shadow-inner relative
              `}
            >
              <div className="absolute inset-2 rounded-full bg-gray-900 shadow-inner">
                <div className="absolute inset-2 rounded-full border-4 border-gray-700" />
              </div>
            </motion.div>
          </div>

          {/* VU Meter */}
          <div className="mb-8 px-8">
            <div className={`
              h-6 rounded-full overflow-hidden
              ${isDark ? 'bg-gray-800' : 'bg-gray-300'}
              shadow-inner
            `}>
              <motion.div
                animate={{ width: `${audioLevel * 100}%` }}
                transition={{ duration: 0.1 }}
                className={`
                  h-full
                  ${audioLevel > 0.8 
                    ? 'bg-red-500' 
                    : audioLevel > 0.5 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                  }
                `}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs opacity-50">
              <span>-40</span>
              <span>-20</span>
              <span>0</span>
              <span>+6</span>
              <span>+12</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!isRecording && !recording && (
              <button
                onClick={startRecording}
                className={`
                  p-6 rounded-full transition-all
                  ${isDark 
                    ? 'bg-red-800 hover:bg-red-700' 
                    : 'bg-red-600 hover:bg-red-700'
                  }
                  text-white shadow-xl hover:shadow-2xl
                  transform hover:scale-110
                `}
              >
                <Mic className="w-8 h-8" />
              </button>
            )}

            {isRecording && (
              <>
                <button
                  onClick={togglePause}
                  className={`
                    p-4 rounded-full transition-all
                    ${isDark 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-500 hover:bg-gray-600'
                    }
                    text-white
                  `}
                >
                  {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                </button>
                <button
                  onClick={stopRecording}
                  className={`
                    p-4 rounded-full transition-all
                    ${isDark 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-500 hover:bg-gray-600'
                    }
                    text-white
                  `}
                >
                  <Square className="w-6 h-6" />
                </button>
              </>
            )}

            {recording && !isRecording && (
              <>
                <audio
                  src={recording.url}
                  controls
                  className="h-12"
                />
                <button
                  onClick={handleSave}
                  disabled={transcribing}
                  className={`
                    px-6 py-3 rounded-full font-semibold transition-all
                    ${isDark 
                      ? 'bg-green-800 hover:bg-green-700' 
                      : 'bg-green-600 hover:bg-green-700'
                    }
                    text-white disabled:opacity-50
                    flex items-center gap-2
                  `}
                >
                  {transcribing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Save
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Status */}
          {isRecording && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              <div className={`
                w-3 h-3 rounded-full animate-pulse
                ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}
              `} />
              <span className="opacity-70">
                {isPaused ? 'Paused' : 'Recording'}
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
