 
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/utils/api'
import Portal from '@/components/Portal'
import { useRole } from '@/contexts/RoleContext'

type InstructorRecord = {
  instructor_id: string
  instructor_name: string
  email: string
  department?: string | null
  assignment_count: number
  courses: Array<{
    course_id: string
    course_code: string
    course_name: string
    section: string
    semester: string
  }>
}

type InstructorForm = {
  name: string
  email: string
  dept: string
}

type ActiveSectionRecord = {
  section_id: string
  course_id: string
  course_code: string
  course_name: string
  section: string
  semester: string
  status: string
  instructor_id?: string
}

type AssignmentForm = {
  section_id: string
  section: string
  semester?: string
}

const defaultInstructorForm: InstructorForm = { name: '', email: '', dept: '' }
const defaultAssignmentForm: AssignmentForm = { section_id: '', section: 'A' }

function normalizeStatus(status?: string) {
  return (status || 'active').toString().toLowerCase()
}

export function InstructorManagement() {
  const { role } = useRole()
  const canManageInstructors = role === 'Admin' || role === 'Department Chair'
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [form, setForm] = useState<InstructorForm>(defaultInstructorForm)
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(defaultAssignmentForm)
  const [assignmentTarget, setAssignmentTarget] = useState<InstructorRecord | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<InstructorRecord['courses'][number] | null>(null)
  const [editingInstructorId, setEditingInstructorId] = useState<string | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [instructors, setInstructors] = useState<InstructorRecord[]>([])
  const [allInstructors, setAllInstructors] = useState<InstructorRecord[]>([])
  const [sections, setSections] = useState<ActiveSectionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  function openAdd() {
    setModalMode('create')
    setEditingInstructorId(null)
    setForm(defaultInstructorForm)
  }

  function openEdit(instructor: InstructorRecord) {
    setModalMode('edit')
    setEditingInstructorId(instructor.instructor_id)
    setForm({
      name: instructor.instructor_name,
      email: instructor.email,
      dept: instructor.department || '',
    })
  }

  function closeInstructorModal() {
    setModalMode(null)
    setEditingInstructorId(null)
    setForm(defaultInstructorForm)
  }

  function openAssign(instructor: InstructorRecord, assignment?: InstructorRecord['courses'][number]) {
    setActiveMenuId(null)
    setAssignmentTarget(instructor)
    setEditingAssignment(assignment ?? null)
    setAssignmentForm(assignment ? { section_id: '', section: assignment.section } : defaultAssignmentForm)
    setShowAssignModal(true)
  }

  function closeAssign() {
    setAssignmentTarget(null)
    setAssignmentForm(defaultAssignmentForm)
    setEditingAssignment(null)
    setShowAssignModal(false)
  }

  async function submitInstructor(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload = {
        instructor_name: form.name,
        email: form.email,
        department: form.dept || undefined,
      }

      if (modalMode === 'edit' && editingInstructorId) {
        await api.patch(`/instructors/${editingInstructorId}`, payload)
      } else {
        await api.post('/instructors', payload)
      }

      await loadInstructors(searchTerm)
      closeInstructorModal()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to ${modalMode === 'edit' ? 'update' : 'add'} instructor`, error)
      alert(`Failed to ${modalMode === 'edit' ? 'update' : 'add'} instructor`)
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteInstructor(instructorId: string) {
    const instructor = instructors.find((item) => item.instructor_id === instructorId)
    if (!instructor) return

    const confirmed = window.confirm(`Remove ${instructor.instructor_name}? This will also remove their assignments.`)
    if (!confirmed) return

    setIsSaving(true)
    try {
      await api.delete(`/instructors/${instructorId}`)
      await loadInstructors(searchTerm)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete instructor', error)
      alert('Failed to delete instructor')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteAssignment(courseId: string, section: string) {
    const assignmentTargetRecord = instructors.flatMap((instructor) => instructor.courses || []).find((assignment) => assignment.course_id === courseId && assignment.section === section)
    if (!assignmentTargetRecord) return

    const confirmed = window.confirm(`Remove section ${section} from ${assignmentTargetRecord.course_code}?`)
    if (!confirmed) return

    setIsSaving(true)
    try {
      // Find the section_id for this assignment
      const sectionRecord = sections.find((s) => s.course_id === courseId && s.section === section)
      
      if (sectionRecord) {
        // Use the new unassign endpoint
        await api.patch(`/sections/${sectionRecord.section_id}/unassign`, {})
      }
      
      await loadInstructors(searchTerm)
      if (editingAssignment && editingAssignment.course_id === courseId && editingAssignment.section === section) {
        closeAssign()
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete assignment', error)
      alert('Failed to delete assignment')
    } finally {
      setIsSaving(false)
    }
  }

  async function submitAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!assignmentTarget) return

    if (!editingAssignment && !assignmentForm.section_id) {
      alert('Please choose an active section.')
      return
    }

    setIsSaving(true)
    try {
      if (editingAssignment) {
        // For editing, we need to unassign from old section first, then assign to new
        // Unassign from current section
        const oldSection = sections.find((s) => s.course_id === editingAssignment.course_id && s.section === editingAssignment.section)
        if (oldSection) {
          await api.patch(`/sections/${oldSection.section_id}/unassign`, {})
        }
        
        // Assign to new section
        const selectedSection = sections.find((section) => section.section_id === assignmentForm.section_id)
        if (selectedSection) {
          const assignPayload = {
            section_id: selectedSection.section_id,
            semester: selectedSection.semester,
          }
          await api.post(`/instructors/${assignmentTarget.instructor_id}/assign`, assignPayload)
        }
      } else {
        const selectedSection = sections.find((section) => section.section_id === assignmentForm.section_id)

        if (!selectedSection) {
          throw new Error('Selected active section was not found.')
        }

        const assignPayload = {
          section_id: selectedSection.section_id,
          semester: selectedSection.semester,
        }

        // Use instructors/:id/assign endpoint
        await api.post(`/instructors/${assignmentTarget.instructor_id}/assign`, assignPayload)
      }
      await loadInstructors(searchTerm)
      await loadSections() // Reload sections to update dropdown
      closeAssign()
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to assign instructor', error)
      const errorMessage = error?.message || error?.body?.message || 'Failed to assign instructor'
      alert(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  async function loadInstructors(query = '') {
    setLoading(true)
    try {
      // Fetch instructors and sections in parallel
      const [instructorsResponse, sectionsResponse] = await Promise.all([
        api.get('/instructors', { limit: 50, query: query || undefined }),
        api.get('/sections'),
      ])
      
      const instructorsData = instructorsResponse?.instructors ?? []
      const sectionsData = sectionsResponse?.sections ?? []
      
      // Map instructors with their assignments from sections
      const mappedInstructors = instructorsData.map((instructor: any) => {
        // Find all sections assigned to this instructor
        const assignedSections = sectionsData.filter((section: any) => 
          section.instructor_id === instructor.instructor_id
        )
        
        // Map sections to course format
        const courses = assignedSections.map((section: any) => ({
          course_id: section.course?.course_id || section.course_id,
          course_code: section.course?.course_code || section.course_code || 'N/A',
          course_name: section.course?.course_name || section.course_name || 'Unknown',
          section: section.section || section.section_code || 'A',
          semester: section.semester || '',
        }))
        
        return {
          instructor_id: instructor.instructor_id,
          instructor_name: instructor.instructor_name,
          email: instructor.email || '',
          department: instructor.department,
          assignment_count: courses.length,
          courses,
        }
      })
      
      setAllInstructors(mappedInstructors)
      setInstructors(mappedInstructors)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load instructors', error)
      setAllInstructors([])
      setInstructors([])
    } finally {
      setLoading(false)
    }
  }

  async function loadSections() {
    try {
      // Use sections endpoint directly
      const response = await api.get('/sections')
      const sectionsData = response?.sections ?? []
      const mappedSections: ActiveSectionRecord[] = sectionsData.map((section: any) => ({
        section_id: section.section_id,
        course_id: section.course?.course_id || section.course_id,
        course_code: section.course?.course_code || section.course_code,
        course_name: section.course?.course_name || section.course_name,
        section: section.section || section.section_code,
        semester: section.semester,
        status: section.status || 'active',
        instructor_id: section.instructor_id
      }))
      setSections(mappedSections)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load active sections', error)
      setSections([])
    }
  }

  useEffect(() => {
    void loadSections()
    void loadInstructors()
  }, [])

  useEffect(() => {
    // Client-side filtering
    if (!searchTerm.trim()) {
      setInstructors(allInstructors)
      return
    }

    const lowerQuery = searchTerm.toLowerCase()
    const filtered = allInstructors.filter((instructor) => {
      const nameMatch = instructor.instructor_name.toLowerCase().includes(lowerQuery)
      const emailMatch = instructor.email.toLowerCase().includes(lowerQuery)
      const deptMatch = (instructor.department || '').toLowerCase().includes(lowerQuery)
      return nameMatch || emailMatch || deptMatch
    })
    setInstructors(filtered)
  }, [searchTerm, allInstructors])

  const totalAssignments = useMemo(
    () => instructors.reduce((sum, instructor) => sum + instructor.assignment_count, 0),
    [instructors],
  )

  const uniqueCoursesCovered = useMemo(
    () => new Set(instructors.flatMap((instructor) => (instructor.courses || []).map((course) => course.course_id))).size,
    [instructors],
  )

  const activeSections = useMemo(
    () => sections.filter((section) => 
      normalizeStatus(section.status) === 'active' && !section.instructor_id
    ),
    [sections],
  )

  return (
    <div className="space-y-6">
      <header className="pb-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-extrabold italic text-[#0f2147] tracking-tight">FACULTY HUB</h1>
          <p className="mt-2 text-sm text-[#0f2147]">MANAGE FACULTY WORKLOADS AND ACADEMIC ALLOCATIONS</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto bg-[#fef9ec] rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#eef2ff] flex items-center justify-center">
              <span className="text-xl text-[#0f2147]">👥</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase">Total Faculty</div>
              <div className="text-2xl font-extrabold text-[#0f2147]">{instructors.length}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#ecfdf5] flex items-center justify-center">
              <span className="text-xl text-green-700">🎓</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase">Active Assignments</div>
              <div className="text-2xl font-extrabold text-[#0f2147]">{totalAssignments}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#fff7ed] flex items-center justify-center">
              <span className="text-xl text-yellow-600">✔️</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase">Courses Covered</div>
              <div className="text-2xl font-extrabold text-[#0f2147]">{uniqueCoursesCovered}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex-1 max-w-lg">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search instructors..."
                className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm bg-white"
              />
            </div>
            {canManageInstructors && (
              <div>
                <button onClick={openAdd} className="ml-4 px-4 py-2 rounded-full bg-[#0f2147] text-yellow-400 shadow">+ Add Instructor</button>
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-6 py-8 text-sm text-gray-500">Loading instructors...</div>
            ) : instructors.length === 0 ? (
              <div className="px-6 py-8 text-sm text-gray-500">No instructors found.</div>
            ) : (
              instructors.map((ins) => {
                const maxAssignments = Math.max(1, ...instructors.map((item) => item.assignment_count), 6)
                const pct = Math.min(100, Math.round((ins.assignment_count / maxAssignments) * 100))

                return (
                  <div key={ins.instructor_id} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff7ed] text-lg font-bold text-[#0f2147]">
                            {ins.instructor_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-[#0f2147]">{ins.instructor_name}</div>
                            <div className="text-sm text-gray-400">{ins.department || 'General'} • {ins.email}</div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-[#dce3f1] bg-[#f9fbff] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-[#8d97b3]">Assigned Sections</div>
                              <div className="mt-1 text-sm font-semibold text-[#0f2147]">
                                {ins.assignment_count > 0 ? `${ins.assignment_count} active assignment${ins.assignment_count === 1 ? '' : 's'}` : 'No active sections assigned'}
                              </div>
                            </div>
                            {canManageInstructors && (
                              <button
                                type="button"
                                onClick={() => openAssign(ins)}
                                className="rounded-full border border-[#dce3f1] bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#0f2147] shadow-[0_8px_18px_rgba(15,33,71,0.04)]"
                              >
                                Assign Instructor
                              </button>
                            )}
                          </div>

                          <div className="mt-3 space-y-2">
                            {(ins.courses || []).length > 0 ? (
                              (ins.courses || []).map((assignment) => (
                                <div key={`${assignment.course_id}-${assignment.section}`} className="rounded-xl bg-white px-3 py-3 shadow-[0_4px_10px_rgba(15,33,71,0.04)] ring-1 ring-[#e5ecf6]">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-[#0f2147]">{assignment.course_code} - {assignment.course_name}</div>
                                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8d97b3]">
                                        <span>Section {assignment.section}</span>
                                        <span className="text-[#c0c8d8]">•</span>
                                        <span>{assignment.semester}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {canManageInstructors && (
                                        <button
                                          type="button"
                                          onClick={() => openAssign(ins, assignment)}
                                          className="rounded-full border border-[#dce3f1] bg-[#f9fbff] px-3 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#0f2147]"
                                        >
                                          Edit
                                        </button>
                                      )}
                                      {canManageInstructors && (
                                        <button
                                          type="button"
                                          onClick={() => void deleteAssignment(assignment.course_id, assignment.section)}
                                          className="rounded-full border border-[#f2c1bb] bg-[#fff1f0] px-3 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#b42318]"
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-xl border border-dashed border-[#dce3f1] bg-white px-3 py-3 text-sm text-[#6b7280]">
                                This instructor has no assigned sections yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className="flex items-center justify-end gap-6">
                          <div className="text-right">
                            <div className="text-sm uppercase text-gray-400">Workload</div>
                            <div className="mt-2 w-48">
                              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                <div className={`h-2 rounded-full ${pct > 80 ? 'bg-red-400' : pct > 60 ? 'bg-green-500' : 'bg-green-300'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-[#0f2147]">{ins.assignment_count}</div>

                          <div className="relative">
                            {canManageInstructors && (
                              <button
                                type="button"
                                onClick={() => setActiveMenuId((current) => (current === ins.instructor_id ? null : ins.instructor_id))}
                                className="rounded-lg bg-[#f6f8fc] px-3 py-2 text-[#0f2147] shadow-[inset_0_0_0_1px_rgba(15,33,71,0.03)]"
                                aria-label={`Actions for ${ins.instructor_name}`}
                              >
                                •••
                              </button>
                            )}
                            {activeMenuId === ins.instructor_id && canManageInstructors && (
                              <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-[#dce3f1] bg-white shadow-[0_18px_30px_rgba(15,33,71,0.12)]">
                                <button type="button" onClick={() => { setActiveMenuId(null); openEdit(ins) }} className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#0f2147] hover:bg-[#f6f8fc]">Edit</button>
                                <button type="button" onClick={() => { setActiveMenuId(null); void deleteInstructor(ins.instructor_id) }} className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#b42318] hover:bg-[#fff1f0]">Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      {modalMode && canManageInstructors && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-60 p-6 pt-20">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto p-6 sm:p-8 ring-1 ring-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f2147]">{modalMode === 'edit' ? 'Edit Instructor' : 'Add New Instructor'}</h2>
                  <p className="mt-2 text-sm text-gray-500">{modalMode === 'edit' ? 'Update the selected faculty member' : 'Register a new faculty member'}</p>
                </div>
                <button onClick={closeInstructorModal} className="text-gray-400 text-xl leading-none">×</button>
              </div>

              <form onSubmit={submitInstructor} className="mt-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Full Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dr. Maria Clara" className="w-full px-4 py-3 rounded-lg border border-gray-100 bg-slate-50 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Email Address</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. maria@iae.edu" className="w-full px-4 py-3 rounded-lg border border-gray-100 bg-slate-50 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Department</label>
                  <input value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} placeholder="e.g. Computer Science" className="w-full px-4 py-3 rounded-lg border border-gray-100 bg-slate-50 text-sm" />
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isSaving} className="w-full px-6 py-3 rounded-xl bg-[#0f2147] text-yellow-400 shadow-md disabled:opacity-60">{isSaving ? 'Saving...' : modalMode === 'edit' ? 'SAVE CHANGES' : 'REGISTER INSTRUCTOR'}</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {showAssignModal && assignmentTarget && canManageInstructors && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-60 p-6 pt-20">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto p-6 sm:p-8 ring-1 ring-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f2147]">{editingAssignment ? 'Edit Assignment' : 'Assign Instructor'}</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    {editingAssignment
                      ? `Update section ${editingAssignment.section} for ${editingAssignment.course_code} - ${editingAssignment.course_name}.`
                      : `Assign ${assignmentTarget.instructor_name} to an active section.`}
                  </p>
                </div>
                <button onClick={closeAssign} className="text-gray-400 text-xl leading-none">×</button>
              </div>

              {editingAssignment && (
                <div className="mt-5 rounded-2xl border border-[#dce3f1] bg-[#f9fbff] p-4">
                  <div className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-[#8d97b3]">Current assignment</div>
                  <div className="mt-2 text-sm font-semibold text-[#0f2147]">
                    {editingAssignment.course_code} - {editingAssignment.course_name}
                  </div>
                  <div className="mt-1 text-sm text-[#6b7280]">
                    Section {editingAssignment.section} • {editingAssignment.semester}
                  </div>
                </div>
              )}

              <form onSubmit={submitAssign} className="mt-6 space-y-5">
                {!editingAssignment && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Active Section</label>
                    <select
                      required
                      value={assignmentForm.section_id}
                      onChange={(e) => {
                        const selectedSection = activeSections.find(s => s.section_id === e.target.value)
                        setAssignmentForm({ 
                          ...assignmentForm, 
                          section_id: e.target.value,
                          section: selectedSection?.section || 'A'
                        })
                      }}
                      className="w-full px-4 py-3 rounded-lg border border-gray-100 bg-slate-50 text-sm"
                    >
                      <option value="">Select an active section</option>
                      {activeSections.map((section) => (
                        <option key={section.section_id} value={section.section_id}>
                          {section.course_code} - {section.course_name} • Section {section.section} • {section.semester}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-gray-500">Only active sections are available here.</p>
                  </div>
                )}

                <div className="pt-2">
                  <button type="submit" disabled={isSaving} className="w-full px-6 py-3 rounded-xl bg-[#0f2147] text-yellow-400 shadow-md disabled:opacity-60">{isSaving ? 'Saving...' : editingAssignment ? 'SAVE CHANGES' : 'ASSIGN INSTRUCTOR'}</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
