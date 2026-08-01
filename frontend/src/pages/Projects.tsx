import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { getProjects, createProject, importProject, deleteProject } from '../lib/api'
import {
  PlusCircle,
  Github,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  Search,
} from 'lucide-react'

export function Projects() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === 'true')
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')

  const createMut = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowCreate(false)
    },
  })
  const importMut = useMutation({
    mutationFn: importProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowImport(false)
    },
  })
  const deleteMut = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

  const filtered = projects.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Projects</h1>
          <p className="text-surface-400 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} managed</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="agora-btn-secondary">
            <Download size={16} />
            Import from GitHub
          </button>
          <button onClick={() => setShowCreate(true)} className="agora-btn-primary">
            <PlusCircle size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="agora-input pl-10"
        />
      </div>

      {/* Project List */}
      <div className="space-y-2">
        {filtered.map((project: any) => (
          <div
            key={project.id}
            className="flex items-center justify-between agora-card group"
          >
            <Link
              to={`/projects/${project.id}`}
              className="flex-1 min-w-0 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-surface-800 to-surface-700 flex items-center justify-center flex-shrink-0">
                <Github size={18} className="text-surface-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-surface-100 group-hover:text-agora-400 transition-colors truncate">
                  {project.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
                  {project.github_repo && (
                    <span className="flex items-center gap-1">
                      <Github size={11} />
                      {project.github_owner}/{project.github_repo}
                    </span>
                  )}
                  <span className="agora-badge-green text-[10px]">{project.status}</span>
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              {project.github_repo && (
                <a
                  href={`https://github.com/${project.github_owner}/${project.github_repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="agora-btn-ghost p-2"
                  title="Open on GitHub"
                >
                  <ExternalLink size={15} />
                </a>
              )}
              <button
                onClick={() => {
                  if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                    deleteMut.mutate(String(project.id))
                  }
                }}
                className="agora-btn-ghost p-2 text-surface-500 hover:text-red-400"
                title="Delete project"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-surface-500 py-12">
            {search ? 'No projects match your search.' : 'No projects yet.'}
          </p>
        )}
      </div>

      {/* Create/Import Modals */}
      {(showCreate || showImport) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setShowCreate(false); setShowImport(false) }}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-100 mb-4">
              {showCreate ? 'New Project' : 'Import from GitHub'}
            </h2>
            {showCreate && (
              <form onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                createMut.mutate({
                  name: fd.get('name'),
                  description: fd.get('description'),
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">Name *</label>
                    <input name="name" required className="agora-input" placeholder="My Project" />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">Description</label>
                    <textarea name="description" className="agora-input" rows={3} placeholder="What is this project about?" />
                  </div>
                  <button type="submit" disabled={createMut.isPending} className="agora-btn-primary w-full justify-center">
                    {createMut.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
                  </button>
                </div>
              </form>
            )}
            {showImport && (
              <form onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const input = fd.get('repo') as string
                if (!input.includes('/')) {
                  alert('Repository must be in "owner/repo" format')
                  e.preventDefault()
                  return
                }
                const [owner, repo] = input.split('/')
                importMut.mutate({ github_owner: owner, github_repo: repo })
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">GitHub Repository *</label>
                    <input name="repo" required className="agora-input" placeholder="owner/repo" />
                    <p className="text-xs text-surface-500 mt-1">Format: username/repository-name</p>
                  </div>
                  <button type="submit" disabled={importMut.isPending} className="agora-btn-primary w-full justify-center">
                    {importMut.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Import'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
