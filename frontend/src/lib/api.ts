const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('agora_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }

  return res.json()
}

// Projects
export function getProjects() {
  return request<any[]>('/projects')
}
export function getProject(id: string) {
  return request<any>(`/projects/${id}`)
}
export function createProject(data: any) {
  return request<any>('/projects', { method: 'POST', body: JSON.stringify(data) })
}
export function importProject(data: { github_owner: string; github_repo: string }) {
  return request<any>('/projects/import', { method: 'POST', body: JSON.stringify(data) })
}
export function updateProject(id: string, data: any) {
  return request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function deleteProject(id: string) {
  return request(`/projects/${id}`, { method: 'DELETE' })
}

// Documents
export function getDocuments(projectId: string, type?: string) {
  const query = type ? `?type=${type}` : ''
  return request<any[]>(`/projects/${projectId}/documents${query}`)
}
export function getDocument(projectId: string, docId: string) {
  return request<any>(`/projects/${projectId}/documents/${docId}`)
}
export function getDocumentContent(projectId: string, docId: string) {
  return request<{ content: string }>(`/projects/${projectId}/documents/${docId}/content`)
}
export function createDocument(projectId: string, data: any) {
  return request<any>(`/projects/${projectId}/documents`, { method: 'POST', body: JSON.stringify(data) })
}
export function updateDocument(projectId: string, docId: string, data: any) {
  return request<any>(`/projects/${projectId}/documents/${docId}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function deleteDocument(projectId: string, docId: string) {
  return request(`/projects/${projectId}/documents/${docId}`, { method: 'DELETE' })
}

// Releases
export function getReleases(projectId: string) {
  return request<any[]>(`/projects/${projectId}/releases`)
}
export function getRepository(projectId: string) {
  return request<any>(`/projects/${projectId}/repository`)
}

// Skills
export function getSkills() {
  return request<any[]>('/skills')
}
export function createSkill(data: any) {
  return request<any>('/skills', { method: 'POST', body: JSON.stringify(data) })
}
export function getProjectSkills(projectId: string) {
  return request<any[]>(`/projects/${projectId}/skills`)
}
export function linkSkill(projectId: string, data: { skill_id: number; usage_notes?: string }) {
  return request<any>(`/projects/${projectId}/skills`, { method: 'POST', body: JSON.stringify(data) })
}

// Health & Stats
export function checkHealth() {
  return request<{ status: string }>('/health')
}
export function getStats() {
  return request<{ documents: number; skills: number }>('/stats')
}
