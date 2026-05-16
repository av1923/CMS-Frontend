import { useEffect, useState } from 'react'
import NavTab from '@/components/NavTab'
import Portal from '@/components/Portal'
import { api } from '@/utils/api'
import { useRole } from '@/contexts/RoleContext'
import type { Course } from '@/types'

// Empty fallback when API fails
const fallbackCourses: Course[] = []

type CourseForm = {
  course_code: string
  course_name: string
  course_type: 'Lecture' | 'Lab'
  units: number
  price: number
  semester: string
  status: 'Draft' | 'Active' | 'Archived'
  section_capacity: number
  reason: string
}

const defaultCourseForm: CourseForm = {
  course_code: '',
  course_name: '',
  course_type: 'Lecture',
  units: 3,
  price: 0,
  semester: '2026-01',
  status: 'Draft',
  section_capacity: 30,
  reason: '',
}

function normalizeStatus(status?: string) {
  return (status || 'active').toString().toLowerCase()
}

export function CourseCatalog() {
  const { role } = useRole()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState<CourseForm>(defaultCourseForm)

  const loadCourses = async () => {
    setLoading(true)
    try {
      // Fetch catalog, sections, and prerequisites
      const [catalogResponse, sectionsResponse] = await Promise.all([
        api.get('/catalog', { limit: 100 }),
        api.get('/sections'),
      ])
      
      const coursesData = catalogResponse?.courses ?? []
      const sectionsData = sectionsResponse?.sections ?? []
      
      // Merge instructor and prerequisite data into courses
      const coursesWithDetails = await Promise.all(
        coursesData.map(async (course: any) => {
          // Find sections assigned to this course
          const courseSections = sectionsData.filter((section: any) => 
            section.course_id === course.course_id || 
            section.course?.course_id === course.course_id
          )
          
          // Get unique instructors for this course
          const instructors = courseSections
            .map((section: any) => section.instructor)
            .filter((instructor: any) => instructor != null)
          
          // Use the first instructor if available
          const primaryInstructor = instructors[0]
          
          // Fetch prerequisites for this course
          let prerequisites: string[] = course.prerequisites || []
          let corequisites: string[] = course.corequisites || []
          
          try {
            const prereqResponse = await api.get(`/prerequisites/${course.course_id}`)
            prerequisites = prereqResponse?.prerequisites?.map((p: any) => p.course_code) || []
            corequisites = prereqResponse?.corequisites?.map((c: any) => c.course_code) || []
          } catch {
            // If prerequisites endpoint fails, use existing data
          }
          
          return {
            ...course,
            instructor_name: primaryInstructor?.instructor_name || primaryInstructor?.name || course.instructor_name,
            instructor_id: primaryInstructor?.instructor_id || primaryInstructor?.id || course.instructor_id,
            prerequisites,
            corequisites,
          }
        })
      )
      
      setCourses(coursesWithDetails)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load courses', error)
      setCourses(fallbackCourses)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCourses()
  }, [])

  const visibleCourses = courses.filter((course) => {
    const normalizedStatus = normalizeStatus(course.status)
    const matchesSearch = [course.course_code, course.course_name, course.course_type, course.status, course.instructor_name, course.instructor_id]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const canManageCourses = role !== 'Registrar' && role !== 'Department Chair'
  const canDeleteCourses = role === 'Admin' || role === 'Curriculum Committee'

  const openCreateModal = () => {
    setEditingCourseId(null)
    setForm(defaultCourseForm)
    setModalMode('create')
    setActiveMenuId(null)
    setIsFilterOpen(false)
  }

  const openEditModal = (course: (typeof courses)[number]) => {
    setEditingCourseId(course.course_id)
    setForm({
      course_code: course.course_code,
      course_name: course.course_name,
      course_type: course.course_type,
      units: course.units,
      price: Number(course.price ?? 0),
      semester: course.semester,
      status: normalizeStatus(course.status) === 'draft'
        ? 'Draft'
        : normalizeStatus(course.status) === 'archived'
          ? 'Archived'
          : 'Active',
      section_capacity: Number(course.section_capacity ?? 30),
      reason: '',
    })
    setModalMode('edit')
    setActiveMenuId(null)
    setIsFilterOpen(false)
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingCourseId(null)
    setForm(defaultCourseForm)
  }

  const handleDelete = async (courseId: string) => {
    const course = courses.find((item) => item.course_id === courseId)
    if (!course) return

    const confirmed = window.confirm(`Delete ${course.course_code} - ${course.course_name}? This cannot be undone.`)
    if (!confirmed) return

    try {
      await api.delete(`/courses/${courseId}`)
      await loadCourses()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete course', error)
      alert('Failed to delete course')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        course_code: form.course_code,
        course_name: form.course_name,
        course_type: form.course_type,
        units: Number(form.units),
        price: Number(form.price),
        section_capacity: Number(form.section_capacity),
        semester: form.semester,
        status: form.status,
        is_elective: false,
      }

      if (modalMode === 'edit' && editingCourseId) {
        await api.patch(`/courses/${editingCourseId}`, payload)
      } else {
        await api.post('/courses', payload)
      }

      await loadCourses()
      closeModal()
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error(`Failed to ${modalMode === 'edit' ? 'update' : 'create'} course`, error)
      const errorMessage = error?.message || error?.body?.message || `Failed to ${modalMode === 'edit' ? 'update' : 'create'} course`
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="pb-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-extrabold italic text-[#0f2147] tracking-tight">ACADEMIC PROGRAMS</h1>
          <p className="mt-2 text-sm text-[#0f2147]">ACADEMIC PROGRAM & CURRICULUM DEVELOPMENT PORTAL</p>

          <nav className="mt-6 flex gap-8 text-sm font-semibold">
            {role === 'Registrar' ? (
              <>
                <NavTab to="/courses/oversight" label="PROPOSAL OVERSIGHT" />
                <NavTab to="/courses" label="ACADEMIC CATALOG" />
              </>
            ) : (
              <>
                {((role as string) !== 'Department Chair') && <NavTab to="/courses/oversight" label="PROPOSAL OVERSIGHT" />}
                <NavTab to="/courses" label="ACADEMIC CATALOG" />
                {((role as string) !== 'Department Chair' && (role as string) !== 'Registrar') && <NavTab to="/prerequisites" label="PREREQUISITE MANAGER" />}
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto rounded-2xl bg-white p-6 shadow-[0_10px_24px_rgba(15,33,71,0.06)] ring-1 ring-[#dce6f4]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative max-w-lg">
              <input
                className="w-full rounded-2xl border border-[#dce3f1] bg-white px-4 py-3 placeholder-gray-400 shadow-[0_8px_18px_rgba(15,33,71,0.04)]"
                placeholder="Search by code, title, type, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFilterOpen((value) => !value)}
              className="rounded-full border border-[#dce3f1] bg-white px-4 py-2 font-semibold text-[#0f2147] shadow-[0_8px_18px_rgba(15,33,71,0.04)]"
            >
              Filter
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full z-20 mt-3 w-44 overflow-hidden rounded-2xl border border-[#dce3f1] bg-white shadow-[0_18px_30px_rgba(15,33,71,0.12)]">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'active', label: 'Active' },
                  { key: 'draft', label: 'Draft' },
                  { key: 'archived', label: 'Archived' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option.key as typeof statusFilter)
                      setIsFilterOpen(false)
                    }}
                    className={`block w-full px-4 py-3 text-left text-sm font-semibold transition ${statusFilter === option.key ? 'bg-[#fff6cb] text-[#0f2147]' : 'text-[#334155] hover:bg-[#f6f8fc]'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {canManageCourses && (
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-full bg-[#0f2147] px-6 py-3 text-[0.72rem] font-extrabold tracking-[0.25em] text-[#ffd233] shadow-[0_12px_28px_rgba(15,33,71,0.24)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,33,71,0.28)]"
              >
                NEW COURSE
              </button>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {loading ? (
            <div className="rounded-2xl border border-[#dce3f1] bg-[#f9fbff] px-6 py-12 text-center text-[#0f2147]">
              Loading courses...
            </div>
          ) : visibleCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dce3f1] bg-[#f9fbff] px-6 py-12 text-center text-[#6b7280]">
              No courses match the current search or filter.
            </div>
          ) : (
            visibleCourses.map((course) => {
              const statusLabel = course.status || 'Active'
              const normalizedStatus = normalizeStatus(course.status)

              return (
                <div
                  key={course.course_id}
                  className="rounded-2xl border border-[#dce6f4] bg-[#fbfdff] p-6 shadow-[0_12px_28px_rgba(15,33,71,0.04)]"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-[1.08rem] font-extrabold uppercase tracking-[0.12em] text-[#0f2147]">
                          {course.course_code} - {course.course_name}
                        </h3>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[0.65rem] font-extrabold tracking-[0.16em] ${normalizedStatus === 'active' ? 'border border-emerald-200 bg-emerald-50 text-emerald-600' : normalizedStatus === 'draft' ? 'border border-amber-200 bg-amber-50 text-amber-700' : 'border border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {statusLabel.toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#8d97b3]">
                        <span className="rounded-md bg-[#f4f7fb] px-2.5 py-1 text-[#93a3c4] shadow-[inset_0_0_0_1px_rgba(15,33,71,0.03)]">
                          {course.course_code}
                        </span>
                        <span>{course.units} Units</span>
                        <span className="text-[#c0c8d8]">•</span>
                        <span>{course.course_type}</span>
                        <span className="text-[#c0c8d8]">•</span>
                        <span>{course.is_elective ? 'Elective' : 'Core'}</span>
                        <span className="text-[#c0c8d8]">•</span>
                        <span className="text-emerald-600">{course.price}</span>
                      </div>

                      <div className="mt-3 text-sm text-[#6b7280]">
                        Instructor: <span className="font-semibold text-[#0f2147]">{course.instructor_name || 'Unassigned'}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#8d97b3]">Prereq:</span>
                        {Array.isArray(course.prerequisites) && course.prerequisites.length > 0 ? (
                          course.prerequisites.map((prerequisite) => (
                            <span key={prerequisite} className="inline-flex items-center rounded-md bg-[#fff0b8] px-3 py-1 text-[0.72rem] font-extrabold tracking-[0.1em] text-[#0f2147] shadow-[0_4px_10px_rgba(15,33,71,0.04)]">
                              {prerequisite}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-[#f4f7fb] px-3 py-1 text-[0.72rem] font-extrabold tracking-[0.1em] text-[#93a3c4]">
                            NONE
                          </span>
                        )}

                        <span className="ml-2 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#8d97b3]">Coreq:</span>
                        {Array.isArray(course.corequisites) && course.corequisites.length > 0 ? (
                          course.corequisites.map((corequisite) => (
                            <span key={corequisite} className="inline-flex items-center rounded-md bg-[#e8f3ff] px-3 py-1 text-[0.72rem] font-extrabold tracking-[0.1em] text-[#0f2147] shadow-[0_4px_10px_rgba(15,33,71,0.04)]">
                              {corequisite}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-[#f4f7fb] px-3 py-1 text-[0.72rem] font-extrabold tracking-[0.1em] text-[#93a3c4]">
                            NONE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative flex shrink-0 items-start gap-3">
                      {(canManageCourses || canDeleteCourses) && (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveMenuId((current) => (current === course.course_id ? null : course.course_id))}
                            className="rounded-xl bg-[#f6f8fc] px-3 py-3 text-[#0f2147] shadow-[inset_0_0_0_1px_rgba(15,33,71,0.03)]"
                            aria-label={`Actions for ${course.course_code}`}
                          >
                            •••
                          </button>

                          {activeMenuId === course.course_id && (
                            <div className="absolute right-0 top-12 z-10 w-40 overflow-hidden rounded-2xl border border-[#dce3f1] bg-white shadow-[0_18px_30px_rgba(15,33,71,0.12)]">
                              {canManageCourses && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(course)}
                                  className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#0f2147] hover:bg-[#f6f8fc]"
                                >
                                  Edit
                                </button>
                              )}
                              {canDeleteCourses && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null)
                                    void handleDelete(course.course_id)
                                  }}
                                  className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#b42318] hover:bg-[#fff1f0]"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {modalMode && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-4 backdrop-blur-md sm:px-6 sm:py-6">
            <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-[0_30px_90px_rgba(15,33,71,0.25)] ring-1 ring-[#0f2147]/10">
              <div className="px-8 py-8 sm:px-12 sm:py-10">
                <div>
                  <h2 className="text-3xl font-extrabold uppercase tracking-wide text-[#0f2147]">
                    {modalMode === 'edit' ? 'EDIT COURSE' : 'NEW COURSE PROPOSAL'}
                  </h2>
                  <p className="mt-2 text-sm uppercase tracking-wide text-[#6b7280]">
                    {modalMode === 'edit'
                      ? 'Update the course details, status, and pricing information.'
                      : 'Submit a new course proposal for review before it is added to the catalog.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#0f2147]">COURSE CODE *</label>
                      <input
                        required
                        placeholder="e.g. CS101"
                        value={form.course_code}
                        onChange={(e) => setForm({ ...form, course_code: e.target.value })}
                        className="mt-3 w-full rounded-lg border border-gray-100 bg-white px-6 py-4 text-base shadow-sm placeholder:text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#0f2147]">COURSE TITLE *</label>
                      <input
                        required
                        placeholder="e.g. Introduction to Computing"
                        value={form.course_name}
                        onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                        className="mt-3 w-full rounded-lg border border-gray-100 bg-white px-6 py-4 text-base shadow-sm placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-600">TYPE</label>
                      <select
                        value={form.course_type}
                        onChange={(e) => setForm({ ...form, course_type: e.target.value as CourseForm['course_type'] })}
                        className="mt-3 w-full rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm"
                      >
                        <option>Lecture</option>
                        <option>Lab</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-600">UNITS</label>
                      <input
                        type="number"
                        min="1"
                        value={form.units}
                        onChange={(e) => setForm({ ...form, units: Number(e.target.value) })}
                        className="mt-3 w-full rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-600">STATUS</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as CourseForm['status'] })}
                        className="mt-3 w-full rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm"
                      >
                        <option>Draft</option>
                        <option>Active</option>
                        <option>Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-600">SEMESTER OFFERED</label>
                      <input
                        placeholder="2026-01"
                        value={form.semester}
                        onChange={(e) => setForm({ ...form, semester: e.target.value })}
                        className="mt-3 w-full rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="border border-green-100 rounded-lg bg-green-50 p-6">
                      <label className="text-xs font-semibold text-green-700">BASE TUITION FEE (PHP)</label>
                      <div className="mt-3">
                        <input
                          type="number"
                          min="0"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                          className="w-full rounded-lg border border-green-200 bg-white px-4 py-3 text-lg font-semibold text-green-800 sm:w-56"
                        />
                      </div>
                    </div>

                    <div className="border border-[#dce3f1] rounded-lg bg-[#f9fbff] p-6">
                      <label className="text-xs font-semibold uppercase tracking-wide text-[#0f2147]">SECTION CAPACITY</label>
                      <div className="mt-3">
                        <input
                          type="number"
                          min="1"
                          value={form.section_capacity}
                          onChange={(e) => setForm({ ...form, section_capacity: Number(e.target.value) })}
                          className="w-full rounded-lg border border-[#dce3f1] bg-white px-4 py-3 text-lg font-semibold text-[#0f2147]"
                        />
                      </div>
                    </div>
                  </div>

                  {modalMode === 'create' && (
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-600">REASON FOR PROPOSAL *</label>
                      <textarea
                        required
                        placeholder="Explain the academic necessity and target audience for this new course..."
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        className="mt-3 h-36 w-full resize-none rounded-xl border border-gray-100 bg-white px-6 py-5 text-base shadow-sm placeholder:text-slate-300"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <button type="button" onClick={closeModal} className="text-sm text-slate-600">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-full bg-[#0f2147] px-6 py-3 text-sm font-semibold uppercase text-yellow-400 shadow-[0_8px_24px_rgba(15,33,71,0.35)] disabled:opacity-60"
                    >
                      {isSubmitting ? 'Saving...' : modalMode === 'edit' ? 'Save Changes' : 'Submit Proposal'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

export default CourseCatalog