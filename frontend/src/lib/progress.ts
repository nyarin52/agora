export interface ProgressTask {
  text: string
  done: boolean
}

export interface Milestone {
  label: string
  status: 'done' | 'active' | 'upcoming'
  tasks: ProgressTask[]
  subGroups: { label: string; tasks: ProgressTask[] }[]
}

/**
 * Parse markdown progress text into structured milestones.
 *
 * Expected format:
 *   ## Done / In Progress / Up Next  (section = milestone)
 *   ### Tier 1 ...                   (sub-group within a milestone)
 *   - [x] task                        (done task)
 *   - [ ] task                        (pending task)
 *
 * Sections without checkboxes (e.g. "## Notes") are skipped.
 */
export function parseProgress(raw: string): Milestone[] {
  const milestones: Milestone[] = []
  const lines = raw.split('\n')

  let current: Milestone | null = null
  let currentSub: { label: string; tasks: ProgressTask[] } | null = null

  for (const line of lines) {
    const h2 = line.match(/^## (.+)/)
    const h3 = line.match(/^### (.+)/)
    const task = line.match(/^-\s*\[(x| )\]\s+(.+)/i)

    if (h2) {
      // flush previous
      if (current) flushMilestone(current, milestones)

      const label = h2[1].trim()
      const status = detectStatus(label)
      if (status !== null) {
        current = { label, status, tasks: [], subGroups: [] }
        currentSub = null
      } else {
        // non-milestone section (e.g. "## Notes") — stop tracking
        current = null
        currentSub = null
      }
    } else if (h3 && current) {
      if (currentSub) current.subGroups.push(currentSub)
      currentSub = { label: h3[1].trim(), tasks: [] }
    } else if (task && (current || currentSub)) {
      const item: ProgressTask = { text: task[2].trim(), done: task[1].toLowerCase() === 'x' }
      if (currentSub) {
        currentSub.tasks.push(item)
      } else {
        current!.tasks.push(item)
      }
    }
  }

  // flush last
  if (currentSub && current) current.subGroups.push(currentSub)
  if (current) flushMilestone(current, milestones)

  return milestones
}

function flushMilestone(m: Milestone, list: Milestone[]) {
  if (m.subGroups.length === 0 && m.tasks.length === 0) return
  list.push(m)
}

function detectStatus(label: string): Milestone['status'] | null {
  const lower = label.toLowerCase()
  if (lower.includes('done') || lower.includes('✅')) return 'done'
  if (lower.includes('progress') || lower.includes('🔧')) return 'active'
  if (lower.includes('next') || lower.includes('📋') || lower.includes('todo')) return 'upcoming'
  return null
}

/** Compute overall completion % across all milestones */
export function computeProgress(milestones: Milestone[]): number {
  let total = 0
  let done = 0
  for (const m of milestones) {
    for (const t of m.tasks) { total++; if (t.done) done++ }
    for (const g of m.subGroups) {
      for (const t of g.tasks) { total++; if (t.done) done++ }
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100)
}
