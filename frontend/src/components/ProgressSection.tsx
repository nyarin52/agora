import { useState, useRef, useEffect } from 'react'
import { parseProgress, computeProgress, type Milestone } from '../lib/progress'
import {
  ClipboardList,
  Pencil,
  Check,
  RotateCcw,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronDown,
} from 'lucide-react'

const statusMeta: Record<Milestone['status'], { bg: string; dot: string; badge: string; label: string; border: string; divider: string }> = {
  done:     { bg: 'bg-emerald-500/10', dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]', badge: 'agora-badge-green', label: 'Done',     border: 'border-emerald-500/20', divider: 'divide-surface-800/30' },
  active:   { bg: 'bg-agora-500/10',    dot: 'bg-agora-400 shadow-[0_0_8px_rgba(76,110,245,0.4)]',    badge: 'agora-badge-blue',  label: 'In Progress', border: 'border-agora-500/20',    divider: 'divide-surface-800/30' },
  upcoming: { bg: 'bg-surface-800',     dot: 'bg-surface-500', badge: 'agora-badge-gray', label: 'Upcoming', border: 'border-surface-700', divider: 'divide-surface-900/40' },
}

interface Props {
  progress: string
  onSave: (text: string) => Promise<void>
}

export function ProgressSection({ progress, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const milestones = parseProgress(progress || '')
  const pct = computeProgress(milestones)
  const hasContent = milestones.length > 0

  // auto-adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [draft, editing])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleTask = async (taskText: string, milestoneStatus: Milestone['status'], currentlyDone: boolean) => {
    if (milestoneStatus === 'upcoming') return
    const raw = progress || ''

    // Determine source & target sections
    const targetStatus = currentlyDone ? 'active' : 'done'
    const sourceHeader = milestoneStatus === 'done' ? 'Done' : 'In Progress'
    const targetHeader = targetStatus === 'done' ? 'Done' : 'In Progress'

    const fromLine = (currentlyDone ? `- [x] ${taskText}` : `- [ ] ${taskText}`)
    const toLine   = (currentlyDone ? `- [ ] ${taskText}` : `- [x] ${taskText}`)

    // Parse raw markdown into sections block
    let updated = raw
    if (sourceHeader !== targetHeader) {
      // Move between sections
      updated = moveTask(raw, fromLine, toLine, sourceHeader, targetHeader)
    } else {
      // Same section — just toggle
      updated = raw.replace(fromLine, toLine)
    }

    await onSave(updated)
  }

  const handleEditTaskText = async (oldText: string, newText: string, done: boolean) => {
    if (!newText.trim() || oldText === newText) return
    const raw = progress || ''
    const from = done ? `- [x] ${oldText}` : `- [ ] ${oldText}`
    const to   = done ? `- [x] ${newText}` : `- [ ] ${newText}`
    await onSave(raw.replace(from, to))
  }

  const startEdit = () => {
    setDraft(progress || '')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft('')
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList size={18} className="text-surface-400" />
        <h2 className="text-base font-semibold text-surface-200">Progress & TODOs</h2>
        {hasContent && !editing && (
          <span className="ml-2 px-2 py-0.5 rounded-md bg-agora-500/15 text-agora-300 text-xs font-semibold border border-agora-500/20">{pct}%</span>
        )}
      </div>

      <div className="agora-card">
        {editing ? (
          <EditView
            draft={draft}
            setDraft={setDraft}
            textareaRef={textareaRef}
            onSave={handleSave}
            onCancel={cancelEdit}
            saving={saving}
          />
        ) : hasContent ? (
          <DisplayView milestones={milestones} pct={pct} onEdit={startEdit} onToggleTask={handleToggleTask} onEditText={handleEditTaskText} />
        ) : (
          <EmptyView onEdit={startEdit} />
        )}
      </div>
    </section>
  )
}

/* ── Edit View ── */

function EditView({
  draft, setDraft, textareaRef, onSave, onCancel, saving,
}: {
  draft: string; setDraft: (v: string) => void; textareaRef: React.RefObject<HTMLTextAreaElement>;
  onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <textarea
        ref={textareaRef}
        className="w-full min-h-[160px] bg-surface-800 border border-surface-600 rounded-lg p-3 text-sm text-surface-200 placeholder-surface-600 focus:outline-none focus:border-agora-500/50 resize-y font-mono leading-relaxed"
        placeholder={`## Done ✅
- [x] completed task

## In Progress 🔧
- [ ] pending task

## Up Next 📋
- [ ] upcoming task`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
      />
      <p className="text-[11px] text-surface-600">
        Use <code className="text-agora-400">## Section</code> for milestones, <code className="text-agora-400">- [x]</code> / <code className="text-agora-400">- [ ]</code> for tasks
      </p>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="agora-btn-ghost text-xs">
          <RotateCcw size={14} /> Cancel
        </button>
        <button onClick={onSave} disabled={saving} className="agora-btn-primary text-xs">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save
        </button>
      </div>
    </div>
  )
}

/* ── Empty View ── */

function EmptyView({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="text-center py-6">
      <ClipboardList size={28} className="mx-auto text-surface-600 mb-2" />
      <p className="text-surface-500 text-sm">No progress notes yet</p>
      <button onClick={onEdit} className="mt-3 agora-btn-ghost text-xs">
        <Pencil size={14} /> Add progress
      </button>
    </div>
  )
}

/* ── Display View ── */

function DisplayView({ milestones, pct, onEdit, onToggleTask, onEditText }: {
  milestones: Milestone[]; pct: number; onEdit: () => void
  onToggleTask: (text: string, milestoneStatus: Milestone['status'], done: boolean) => void
  onEditText: (oldText: string, newText: string, done: boolean) => void
}) {
  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <ProgressBar milestones={milestones} pct={pct} />

      {/* Task Table */}
      <TaskTable milestones={milestones} onToggleTask={onToggleTask} onEditText={onEditText} />

      {/* Edit Button */}
      <div className="flex justify-end pt-1">
        <button onClick={onEdit} className="agora-btn-ghost text-xs">
          <Pencil size={14} /> Edit
        </button>
      </div>
    </div>
  )
}

/* ── Progress Bar ── */

function ProgressBar({ milestones, pct }: { milestones: Milestone[]; pct: number }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const count = milestones.length

  const nodePositions = milestones.map((_, i) => {
    if (count === 1) return 50  // single node centered
    return (i / (count - 1)) * 100
  })

  return (
    <div className="pb-4 mb-4 border-b border-surface-800">
      {/* Bar track — give plenty of room below for node labels */}
      <div className="relative pt-2 pb-14">
        {/* Track line */}
        <div className="relative h-2 bg-surface-800 rounded-full">
          {/* Filled portion */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-agora-500 to-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
          {/* Nodes */}
          {milestones.map((m, i) => {
            const meta = statusMeta[m.status]
            const isHovered = hoverIdx === i

            return (
              <div
                key={i}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: `${nodePositions[i]}%` }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {/* Node dot */}
                <div className={`w-4 h-4 rounded-full border-2 border-surface-900 ${meta.dot} transition-transform duration-200 ${isHovered ? 'scale-125' : ''}`} />

                {/* Vertical line + label below */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2">
                  <div className="w-px h-6 bg-surface-700 mx-auto" />
                  <span className={`block text-xs whitespace-nowrap mt-1 font-semibold transition-colors duration-200 ${isHovered ? 'text-surface-100' : 'text-surface-300'}`}>
                    {m.label}
                  </span>
                  <span className="block text-[10px] whitespace-nowrap text-surface-400 font-medium transition-colors duration-200 text-center mt-0.5">
                    {milestoneDone(m)}/{milestoneTotal(m)} done
                  </span>
                </div>

                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 shadow-xl z-20 whitespace-nowrap">
                    <p className="text-xs text-surface-200 font-medium">{m.label}</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">
                      <span className="text-emerald-400">{milestoneDone(m)}</span>
                      <span className="text-surface-600"> / </span>
                      <span>{milestoneTotal(m)}</span>
                      <span className="text-surface-600"> tasks completed</span>
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Task Table ── */

function TaskTable({ milestones, onToggleTask, onEditText }: {
  milestones: Milestone[]
  onToggleTask: (text: string, milestoneStatus: Milestone['status'], done: boolean) => void
  onEditText: (oldText: string, newText: string, done: boolean) => void
}) {
  // collapsed tracker: key = milestone index, true = expanded
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    milestones.forEach((m, i) => {
      // collapse only "done" by default
      init[i] = m.status === 'done'
    })
    return init
  })

  const toggle = (i: number) => {
    setCollapsed(prev => ({ ...prev, [i]: !prev[i] }))
  }

  return (
    <div className="space-y-4">
      {milestones.map((m, mi) => {
        const meta = statusMeta[m.status]
        const isCollapsed = collapsed[mi]
        const doneCount = milestoneDone(m)
        const totalCount = milestoneTotal(m)

        return (
          <div key={mi} className={`rounded-xl ${meta.bg} border ${meta.border} overflow-hidden`}>
            {/* Milestone header — clickable toggle */}
            <button
              type="button"
              onClick={() => toggle(mi)}
              className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-surface-700/40 hover:brightness-110 transition-colors text-left"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot.replace(/shadow-\[[^\]]+\]\s*/, '')}`} />
              <span className={meta.badge}>{meta.label}</span>
              <span className="text-[11px] text-surface-500 ml-1">
                {doneCount}/{totalCount}
              </span>
              {/* Spacer */}
              <span className="flex-1" />
              <ChevronDown
                size={16}
                className={`text-surface-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
              />
            </button>

            {/* Tasks — collapsible body */}
            {!isCollapsed && (
              <div className={`divide-y ${meta.divider}`}>
                {m.tasks.map((t, ti) => (
                  <TaskRow key={ti} task={t} milestoneStatus={m.status} onToggle={onToggleTask} onEditText={onEditText} />
                ))}
                {m.subGroups.map((g, gi) => (
                  <div key={gi}>
                    <div className="px-4 py-1.5 text-[11px] font-medium text-surface-500 uppercase tracking-wide bg-surface-900/30">
                      {g.label}
                    </div>
                    {g.tasks.map((t, ti2) => (
                      <TaskRow key={ti2} task={t} milestoneStatus={m.status} onToggle={onToggleTask} onEditText={onEditText} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TaskRow({ task, milestoneStatus, onToggle, onEditText }: {
  task: { text: string; done: boolean }
  milestoneStatus: Milestone['status']
  onToggle: (text: string, milestoneStatus: Milestone['status'], done: boolean) => void
  onEditText?: (oldText: string, newText: string, done: boolean) => void
}) {
  const locked = milestoneStatus === 'upcoming'
  const [editingText, setEditingText] = useState(false)
  const [textDraft, setTextDraft] = useState(task.text)
  const inputRef = useRef<HTMLInputElement>(null)

  const commitEdit = () => {
    const trimmed = textDraft.trim()
    if (trimmed && trimmed !== task.text && onEditText) {
      onEditText(task.text, trimmed, task.done)
    }
    setEditingText(false)
  }

  useEffect(() => {
    if (editingText && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingText])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 transition-colors group ${task.done ? '' : locked ? 'cursor-not-allowed opacity-60' : 'hover:bg-surface-800/20'}`}
    >
      {/* Circle button */}
      <button
        type="button"
        onClick={() => { if (!locked) onToggle(task.text, milestoneStatus, task.done) }}
        disabled={locked}
        className={`flex-shrink-0 transition-all duration-150 ${locked ? '' : 'hover:scale-110'}`}
        title={locked ? 'Upcoming tasks cannot be toggled' : task.done ? 'Click to unmark as done' : 'Click to mark as done'}
      >
        {task.done ? (
          <CheckCircle2 size={15} className="text-emerald-400 group-hover:text-emerald-300" />
        ) : locked ? (
          <Circle size={15} className="text-surface-700" />
        ) : (
          <Circle size={15} className="text-surface-500 group-hover:text-agora-400" />
        )}
      </button>

      {/* Text — editable on double-click */}
      {editingText ? (
        <input
          ref={inputRef}
          className="flex-1 bg-surface-800 border border-agora-500/30 rounded px-2 py-0.5 text-sm text-surface-200 focus:outline-none"
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') { setTextDraft(task.text); setEditingText(false) }
          }}
        />
      ) : (
        <span
          className={`text-sm select-none ${task.done ? 'text-surface-400 line-through' : 'text-surface-200'} ${locked ? '' : 'cursor-default'}`}
          onDoubleClick={() => { if (!locked) { setTextDraft(task.text); setEditingText(true) } }}
          title="Double-click to edit"
        >
          {task.text}
        </span>
      )}
    </div>
  )
}

/* ── Helpers ── */

function milestoneDone(m: Milestone) {
  let done = m.tasks.filter(t => t.done).length
  for (const g of m.subGroups) done += g.tasks.filter(t => t.done).length
  return done
}

function milestoneTotal(m: Milestone) {
  let total = m.tasks.length
  for (const g of m.subGroups) total += g.tasks.length
  return total
}

/**
 * Move a task line from one ## Section to another in raw markdown text.
 * Finds the source line, removes it, and inserts at the end of the target section.
 */
function moveTask(raw: string, fromLine: string, toLine: string, sourceHeader: string, targetHeader: string): string {
  const lines = raw.split('\n')
  const sourceIdx = lines.findIndex((l) => l.trim() === fromLine)
  if (sourceIdx === -1) return raw.replace(fromLine, toLine)

  // Remove source line
  lines.splice(sourceIdx, 1)

  // Find target ## header
  const re = new RegExp(`^##\\s+${escapeRegex(targetHeader)}`, 'i')
  const targetIdx = lines.findIndex((l) => re.test(l))
  if (targetIdx === -1) return raw.replace(fromLine, toLine)

  // Find insertion point: after the last content line of the target section
  // (before next ## or EOF)
  let insertIdx = targetIdx + 1
  while (insertIdx < lines.length && !lines[insertIdx].match(/^## /)) {
    insertIdx++
  }

  lines.splice(insertIdx, 0, toLine)
  return lines.join('\n')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
