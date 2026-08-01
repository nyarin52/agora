import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProject, getReleases, getProjectSkills, getDocuments, getDocumentContent, getRepository, updateProject } from '../lib/api'
import { ProgressSection } from '../components/ProgressSection'
import {
  ArrowLeft,
  Github,
  ExternalLink,
  Tag,
  FileText,
  Puzzle,
  Download,
  Loader2,
  AlertCircle,
  Globe,
  BookOpen,
  X,
} from 'lucide-react'

const docTypeMeta: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  dev_note:    { label: 'Dev Note',     icon: BookOpen, color: 'text-agora-400' },
  changelog:   { label: 'Changelog',    icon: FileText, color: 'text-amber-400' },
  summary:     { label: 'Summary',      icon: FileText, color: 'text-emerald-400' },
  design:      { label: 'Design Doc',   icon: FileText, color: 'text-purple-400' },
}

function SectionHeader({ title, icon: Icon, count }: { title: string; icon: any; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={18} className="text-surface-400" />
      <h2 className="text-base font-semibold text-surface-200">{title}</h2>
      {count !== undefined && (
        <span className="text-xs text-surface-500 ml-1">({count})</span>
      )}
    </div>
  )
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [viewingDoc, setViewingDoc] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  })
  const { data: releases = [] } = useQuery({
    queryKey: ['releases', id],
    queryFn: () => getReleases(id!),
    enabled: !!id,
  })
  const { data: skills = [] } = useQuery({
    queryKey: ['project-skills', id],
    queryFn: () => getProjectSkills(id!),
    enabled: !!id,
  })
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => getDocuments(id!),
    enabled: !!id,
  })
  const { data: repository } = useQuery({
    queryKey: ['repository', id],
    queryFn: () => getRepository(id!),
    enabled: !!id,
  })
  const { data: docContent } = useQuery({
    queryKey: ['document-content', id, viewingDoc?.id],
    queryFn: () => getDocumentContent(id!, String(viewingDoc.id)),
    enabled: !!id && !!viewingDoc,
  })

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-agora-400" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={40} className="mx-auto text-surface-600 mb-4" />
        <p className="text-surface-400">Project not found</p>
        <Link to="/projects" className="text-agora-400 hover:text-agora-300 text-sm mt-2 inline-block">
          Back to projects
        </Link>
      </div>
    )
  }

  const hasGithub = !!(repository?.linked || (project.github_owner && project.github_repo))
  const repoURL = repository?.html_url || repository?.url || project.repository_url ||
    (project.github_owner && project.github_repo
      ? `https://github.com/${project.github_owner}/${project.github_repo}`
      : '')
  const repoLabel = repository?.owner && repository?.repo
    ? `${repository.owner}/${repository.repo}`
    : project.github_owner && project.github_repo
      ? `${project.github_owner}/${project.github_repo}`
      : repoURL
  const docTypes = ['dev_note', 'design', 'changelog', 'summary']
  const releaseList = releases ?? []
  const skillList = skills ?? []
  const documentList = documents ?? []

  const docsByTypeGrouped: Record<string, any[]> = {}
  for (const d of documentList) {
    if (!docsByTypeGrouped[d.type]) docsByTypeGrouped[d.type] = []
    docsByTypeGrouped[d.type].push(d)
  }

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Breadcrumb */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to projects
      </Link>

      {/* ===== 1. Description ===== */}
      <section>
        <div className="agora-card">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-2xl font-bold text-surface-50">{project.name}</h1>
            <span className="agora-badge-green">{project.status}</span>
          </div>
          {project.description ? (
            <p className="text-surface-300 leading-relaxed">{project.description}</p>
          ) : (
            <p className="text-surface-600 text-sm italic">No description</p>
          )}
        </div>
      </section>

      {/* ===== 2. Progress & TODOs ===== */}
      <ProgressSection
        progress={project.progress || ''}
        onSave={async (text) => {
          await updateProject(id!, { ...project, progress: text })
          queryClient.invalidateQueries({ queryKey: ['project', id] })
        }}
      />

      {/* ===== 3. Repository ===== */}
      <section>
        <SectionHeader title="Repository" icon={Github} />
        {hasGithub && repoURL ? (
          <a
            href={repoURL}
            target="_blank"
            rel="noopener noreferrer"
            className="agora-card flex items-center justify-between hover:border-agora-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Github size={20} className="text-surface-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-mono text-sm text-surface-200 block truncate">
                  {repoLabel}
                </span>
                {repository?.description && (
                  <p className="text-xs text-surface-500 mt-1 line-clamp-2">{repository.description}</p>
                )}
              </div>
            </div>
            <ExternalLink size={16} className="text-surface-500 flex-shrink-0" />
          </a>
        ) : (
          <div className="agora-card text-center py-8">
            <Globe size={28} className="mx-auto text-surface-600 mb-2" />
            <p className="text-surface-500 text-sm">No GitHub repository linked</p>
            <p className="text-surface-600 text-xs mt-1">
              Link a repo to see releases and commit history
            </p>
          </div>
        )}
      </section>

      {/* ===== 4. Releases ===== */}
      <section>
        <SectionHeader title="Releases" icon={Tag} count={releaseList.length} />
        {releaseList.length === 0 ? (
          <div className="agora-card text-center py-8">
            <Tag size={28} className="mx-auto text-surface-600 mb-2" />
            <p className="text-surface-500 text-sm">
              {hasGithub
                ? 'No GitHub releases found'
                : 'Link a GitHub repository to see releases'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {releaseList.map((release: any, idx: number) => (
              <div key={idx} className="agora-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Tag size={16} className="text-agora-400" />
                    <h3 className="font-semibold text-surface-100">{release.tag_name}</h3>
                    <span className="agora-badge-blue text-xs">{release.published_at}</span>
                  </div>
                  <a
                    href={release.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="agora-btn-ghost text-xs"
                  >
                    View on GitHub
                    <ExternalLink size={12} />
                  </a>
                </div>
                {release.body && (
                  <p className="text-sm text-surface-400 line-clamp-3">{release.body}</p>
                )}
                {release.assets?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {release.assets.map((asset: any, ai: number) => (
                      <a
                        key={ai}
                        href={asset.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs agora-btn-secondary"
                      >
                        <Download size={12} />
                        {asset.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== 5. Documents ===== */}
      <section>
        <SectionHeader title="Documents" icon={FileText} count={documentList.length} />
        {documentList.length === 0 ? (
          <div className="agora-card text-center py-8">
            <FileText size={28} className="mx-auto text-surface-600 mb-2" />
            <p className="text-surface-500 text-sm">No documents yet</p>
            <Link
              to={`/projects/${id}/docs`}
              className="text-agora-400 hover:text-agora-300 text-xs mt-1 inline-block"
            >
              Create your first document →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {docTypes.map((dt) => {
              const docs = docsByTypeGrouped[dt]
              if (!docs || docs.length === 0) return null
              const meta = docTypeMeta[dt] || { label: dt, icon: FileText, color: 'text-surface-400' }
              const Icon = meta.icon
              return (
                <div key={dt}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className={meta.color} />
                    <span className="text-xs font-medium text-surface-400 uppercase tracking-wide">
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-surface-600">{docs.length}</span>
                  </div>
                  <div className="space-y-1">
                    {docs.map((doc: any) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setViewingDoc(doc)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-800/50 transition-colors group text-left"
                      >
                        <FileText size={14} className="text-surface-500 flex-shrink-0" />
                        <span className="text-sm text-surface-300 group-hover:text-surface-100 truncate">
                          {doc.title}
                        </span>
                        <span className="text-[11px] text-surface-600 ml-auto flex-shrink-0">
                          {new Date(doc.updated_at).toLocaleDateString('zh-CN')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== 6. Skills ===== */}
      <section>
        <SectionHeader title="Skills" icon={Puzzle} count={skillList.length} />
        {skillList.length === 0 ? (
          <div className="agora-card text-center py-8">
            <Puzzle size={28} className="mx-auto text-surface-600 mb-2" />
            <p className="text-surface-500 text-sm">No skills linked yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skillList.map((skill: any) => (
              <div key={skill.id} className="agora-card">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Puzzle size={14} className="text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-surface-200">{skill.name}</h4>
                    {skill.description && (
                      <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{skill.description}</p>
                    )}
                    {skill.usage_notes && (
                      <p className="text-xs text-surface-500 mt-1.5 italic">"{skill.usage_notes}"</p>
                    )}
                    {skill.category && (
                      <span className="agora-badge-blue text-[10px] mt-2 inline-block">{skill.category}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Document Preview Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setViewingDoc(null)}>
          <div
            className="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">{viewingDoc.title}</h2>
              <button onClick={() => setViewingDoc(null)} className="agora-btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <div className="prose-custom">
              {docContent?.content ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-surface-300">
                  {docContent.content}
                </pre>
              ) : (
                <Loader2 size={16} className="animate-spin text-agora-400" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
