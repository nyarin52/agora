import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getProjects, checkHealth, getStats } from '../lib/api'
import {
  FolderKanban,
  FileText,
  Puzzle,
  Github,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

export function Dashboard() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 30_000,
  })
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  })

  const statsCards = [
    {
      label: 'Projects',
      value: projects?.length ?? 0,
      icon: FolderKanban,
      color: 'text-agora-400',
      bg: 'bg-agora-500/10',
    },
    {
      label: 'Documents',
      value: stats?.documents ?? '—',
      icon: FileText,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Skills',
      value: stats?.skills ?? '—',
      icon: Puzzle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Repos',
      value: projects?.filter((p: any) => p.github_repo).length ?? 0,
      icon: Github,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">Your development hub overview</p>
        </div>
        <div className="flex items-center gap-2">
          {health?.status === 'healthy' ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 agora-badge-green">
              <CheckCircle2 size={12} />
              System healthy
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-400 agora-badge bg-red-500/10 border border-red-500/20">
              <AlertCircle size={12} />
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <div key={stat.label} className="agora-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-surface-400 font-medium">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-100">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-100">Recent Projects</h2>
          <Link
            to="/projects"
            className="flex items-center gap-1 text-sm text-agora-400 hover:text-agora-300 transition-colors"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-agora-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects && projects.length === 0 ? (
          <div className="agora-card text-center py-12">
            <FolderKanban size={40} className="mx-auto text-surface-600 mb-4" />
            <h3 className="text-surface-300 font-medium mb-2">No projects yet</h3>
            <p className="text-surface-500 text-sm mb-6">
              Import a GitHub repository or create a new project to get started.
            </p>
            <Link to="/projects?create=true" className="agora-btn-primary">
              <PlusCircle size={16} />
              Add your first project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(projects ?? []).slice(0, 6).map((project: any) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="agora-card group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-surface-100 group-hover:text-agora-400 transition-colors">
                    {project.name}
                  </h3>
                  <span className="agora-badge-green text-[10px]">{project.status}</span>
                </div>
                {project.description && (
                  <p className="text-sm text-surface-400 line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}
                {project.github_repo && (
                  <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <Github size={12} />
                    {project.github_owner}/{project.github_repo}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
