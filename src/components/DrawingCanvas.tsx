'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = 'pen' | 'eraser'

interface Point {
  x: number
  y: number
}

interface DrawingCanvasProps {
  onChange?: (dataUrl: string) => void
  width?: number
  height?: number
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DrawingCanvas({
  onChange,
  width = 800,
  height = 450,
  className = '',
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [penSize, setPenSize] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [canUndo, setCanUndo] = useState(false)

  const historyRef = useRef<ImageData[]>([])
  const lastPointRef = useRef<Point | null>(null)

  // ─── Canvas setup ──────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── History helpers ───────────────────────────────────────────────────

  function saveHistory() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    // Keep last 30 states
    if (historyRef.current.length > 30) historyRef.current.shift()
    setCanUndo(historyRef.current.length > 1)
  }

  function undo() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (historyRef.current.length <= 1) return

    historyRef.current.pop()
    const prev = historyRef.current[historyRef.current.length - 1]
    ctx.putImageData(prev, 0, 0)
    setCanUndo(historyRef.current.length > 1)
    emitChange()
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveHistory()
    emitChange()
  }

  // ─── Emit change ───────────────────────────────────────────────────────

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !onChange) return
    onChange(canvas.toDataURL('image/png'))
  }, [onChange])

  // ─── Coordinate helpers ────────────────────────────────────────────────

  function getCanvasPoint(e: React.MouseEvent | React.TouchEvent): Point | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return null
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // ─── Drawing ───────────────────────────────────────────────────────────

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const point = getCanvasPoint(e)
    if (!point) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    lastPointRef.current = point

    ctx.beginPath()
    ctx.arc(point.x, point.y, (tool === 'eraser' ? penSize * 4 : penSize) / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : '#000000'
    ctx.fill()
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing) return

    const point = getCanvasPoint(e)
    if (!point) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const last = lastPointRef.current ?? point

    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(point.x, point.y)

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = penSize * 4
    } else {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = penSize
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastPointRef.current = point
  }

  function stopDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing) return
    setIsDrawing(false)
    lastPointRef.current = null
    saveHistory()
    emitChange()
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const toolBtn = (t: Tool, icon: string, label: string) => (
    <button
      onClick={() => setTool(t)}
      title={label}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
        tool === t
          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
          : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
      }`}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )

  return (
    <div className={`flex flex-col gap-3 ${className}`} ref={containerRef}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-800 border border-slate-700 rounded-xl">
        {/* Tool buttons */}
        <div className="flex items-center gap-1.5">
          {toolBtn('pen', '✏️', 'Pen')}
          {toolBtn('eraser', '⬜', 'Eraser')}
        </div>

        <div className="w-px h-6 bg-slate-600 mx-1 hidden sm:block" />

        {/* Pen size */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs hidden sm:inline">Size</span>
          <input
            type="range"
            min={1}
            max={20}
            value={penSize}
            onChange={(e) => setPenSize(parseInt(e.target.value, 10))}
            className="w-20 sm:w-28 h-1.5 accent-blue-500 cursor-pointer"
            title={`Size: ${penSize}px`}
          />
          <div
            className="rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center shrink-0"
            style={{
              width: Math.max(tool === 'eraser' ? penSize * 2 : penSize + 8, 16),
              height: Math.max(tool === 'eraser' ? penSize * 2 : penSize + 8, 16),
            }}
          >
            <div
              className={`rounded-full ${tool === 'eraser' ? 'bg-slate-400' : 'bg-slate-200'}`}
              style={{
                width: tool === 'eraser' ? Math.min(penSize, 14) : Math.min(penSize, 10),
                height: tool === 'eraser' ? Math.min(penSize, 14) : Math.min(penSize, 10),
              }}
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            onClick={clearCanvas}
            title="Clear canvas"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="rounded-xl overflow-hidden border border-slate-600 shadow-inner">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none bg-white block"
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair', maxHeight: '60vh', objectFit: 'contain' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Status hint */}
      <p className="text-slate-500 text-xs text-center">
        {tool === 'eraser' ? `Eraser active (size ${penSize * 4}px)` : `Pen active (size ${penSize}px)`}
        {' · '}Touch supported · Draw your diagram in the white area above
      </p>
    </div>
  )
}
