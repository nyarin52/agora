import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSkills, createSkill } from '../lib/api'
import { PlusCircle, Puzzle, Loader2, Code2, Search } from 'lucide-react'

export function Skills() {
  const queryClient = useQueryClient()
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  })
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const createMut = useMutation({
    mutationFn: createSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      setShowForm(false)
    },
  })

  const filtered = skills.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-agora-400" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Skills</h1>
          <p className="text-surface-400 text-sm mt-1">Reusable tools and capabilities across projects</p>
        </div>
        <button onClick={() => setShowForm(true)} className="agora-btn-primary">
          <PlusCircle size={16} />
          Register Skill
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="agora-input pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((skill: any) => (
          <div key={skill.id} className="agora-card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Puzzle size={20} className="text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-surface-100">{skill.name}</h3>
                  {skill.category && (
                    <span className="agora-badge-blue text-[10px]">{skill.category}</span>
                  )}
                </div>
                {skill.description && (
                  <p className="text-sm text-surface-400 line-clamp-2">{skill.description}</p>
                )}
                {skill.config_template && skill.config_template !== '{}' && (
                  <div className="mt-3 bg-surface-800 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-surface-500 mb-1">
                      <Code2 size={12} />
                      Config Template
                    </div>
                    <pre className="text-xs text-surface-300 font-mono overflow-x-auto">
                      {skill.config_template.length > 200
                        ? skill.config_template.slice(0, 200) + '...'
                        : skill.config_template}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Puzzle size={40} className="mx-auto text-surface-600 mb-4" />
            <p className="text-surface-500">{search ? 'No skills match your search.' : 'No skills registered yet.'}</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Register Skill</h2>
            <form onSubmit={e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              createMut.mutate({
                name: fd.get('name'),
                description: fd.get('description'),
                category: fd.get('category'),
                config_template: fd.get('config_template') || '{}',
              })
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Name *</label>
                  <input name="name" required className="agora-input" placeholder="react-component-generator" />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Description</label>
                  <input name="description" className="agora-input" placeholder="What does this skill do?" />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Category</label>
                  <input name="category" className="agora-input" placeholder="frontend / testing / deployment" />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Config Template (JSON)</label>
                  <textarea name="config_template" className="agora-input font-mono text-xs" rows={4} placeholder='{"key": "value"}' />
                </div>
                <button type="submit" disabled={createMut.isPending} className="agora-btn-primary w-full justify-center">
                  {createMut.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
