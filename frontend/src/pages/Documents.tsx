import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDocuments, createDocument, getDocumentContent, deleteDocument } from '../lib/api'
import {
  ArrowLeft,
  PlusCircle,
  FileText,
  Trash2,
  Loader2,
  Eye,
  X,
} from 'lucide-react'

const docTypes = [
  { value: 'dev_note', label: 'Dev Notes', color: 'text-agora-400' },
  { value: 'changelog', label: 'Changelogs', color: 'text-amber-400' },
  { value: 'summary', label: 'Summaries', color: 'text-emerald-400' },
  { value: 'design', label: 'Design Docs', color: 'text-purple-400' },
]

export function Documents() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [activeType, setActiveType] = useState('dev_note')
  const [showCreate, setShowCreate] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<any>(null)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', id, activeType],
    queryFn: () => getDocuments(id!, activeType),
    enabled: !!id,
  })

  const { data: docContent } = useQuery({
    queryKey: ['document-content', viewingDoc?.id],
    queryFn: () => getDocumentContent(id!, viewingDoc.id),
    enabled: !!viewingDoc,
  })

  const createMut = useMutation({
    mutationFn: (data: any) => createDocument(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      setShowCreate(false)
    },
  })
  const deleteMut = useMutation({
    mutationFn: (docId: string) => deleteDocument(id!, docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', id] }),
  })

  if (!id) return null

  return (
    <div className="animate-fade-in space-y-6">
      <Link to={`/projects/${id}`} className="flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 transition-colors">
        <ArrowLeft size={16} />
        Back to project
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Documents</h1>
        <button onClick={() => setShowCreate(true)} className="agora-btn-primary">
          <PlusCircle size={16} />
          New Document
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 border-b border-surface-800 pb-0">
        {docTypes.map((dt) => (
          <button
            key={dt.value}
            onClick={() => setActiveType(dt.value)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-[2px] ${
              activeType === dt.value
                ? 'text-surface-100 border-agora-500'
                : 'text-surface-500 border-transparent hover:text-surface-300'
            }`}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* Document List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-agora-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="agora-card text-center py-12">
          <FileText size={40} className="mx-auto text-surface-600 mb-4" />
          <p className="text-surface-500">
            No {docTypes.find(d => d.value === activeType)?.label.toLowerCase()} yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <div key={doc.id} className="agora-card flex items-center justify-between group">
              <button
                onClick={() => setViewingDoc(doc)}
                className="flex items-center gap-3 text-left flex-1 min-w-0"
              >
                <FileText size={18} className="text-surface-500 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-medium text-surface-100 group-hover:text-agora-400 transition-colors truncate">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {new Date(doc.updated_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this document?')) deleteMut.mutate(String(doc.id))
                }}
                className="agora-btn-ghost p-2 text-surface-500 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* View Document Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setViewingDoc(null)}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">{viewingDoc.title}</h2>
              <button onClick={() => setViewingDoc(null)} className="agora-btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <div className="prose-custom">
              {docContent?.content ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{docContent.content}</pre>
              ) : (
                <Loader2 size={16} className="animate-spin" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Document Modal — manual index entry */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Add {docTypes.find(d => d.value === activeType)?.label} Index</h2>
            <form onSubmit={e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              createMut.mutate({
                type: activeType,
                title: fd.get('title'),
                file_path: fd.get('file_path'),
                tags: fd.get('tags') || '[]',
              })
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Title *</label>
                  <input name="title" required className="agora-input" placeholder="Document title" />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">File Path *</label>
                  <input name="file_path" required className="agora-input font-mono text-sm" placeholder="docs/dev_note/我的笔记.md" />
                  <p className="text-xs text-surface-600 mt-1">Absolute or relative path to the .md file on disk. Agora only indexes metadata — the file must already exist.</p>
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Tags (JSON array)</label>
                  <input name="tags" className="agora-input font-mono text-xs" placeholder='["bugfix", "v1.0"]' />
                </div>
                <button type="submit" disabled={createMut.isPending} className="agora-btn-primary w-full justify-center">
                  {createMut.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Add Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
