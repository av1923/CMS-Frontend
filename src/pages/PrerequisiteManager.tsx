import { useEffect, useMemo, useState } from 'react'
import { api } from '@/utils/api'
import NavTab from '@/components/NavTab'
import Portal from '@/components/Portal'
import { useRole } from '@/contexts/RoleContext'
import { useNavigate } from 'react-router-dom'

type CourseRecord = {
  course_id: string
  course_code: string
  course_name: string
  status: string
  prerequisites?: string[]
  corequisites?: string[]
}

type DependencyResponse = {
  course_id: string
  course_code: string
  prerequisites: Array<{ course_code: string; course_name: string; type: string }>
  corequisites: Array<{ course_code: string; course_name: string; type: string }>
}

export function PrerequisiteManager() {
  const { role } = useRole()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role === 'Department Chair') {
      navigate('/courses', { replace: true })
    }

    if (role === 'Registrar') {
      navigate('/courses/oversight', { replace: true })
    }
  }, [role, navigate])

  const [showModal, setShowModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<CourseRecord | null>(null)
  const [selectedPrereqCodes, setSelectedPrereqCodes] = useState<string[]>([])
  const [selectedCoreqCodes, setSelectedCoreqCodes] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const loadCourses = async () => {
    setLoading(true)
    try {
      // Fetch catalog and prerequisites for each course
      const response = await api.get('/catalog', { limit: 100 })
      const coursesData = response?.courses ?? []
      
      // Fetch prerequisites for each course
      const coursesWithPrereqs = await Promise.all(
        coursesData.map(async (course: any) => {
          try {
            const prereqResponse = await api.get(`/prerequisites/${course.course_id}`)
            return {
              course_id: course.course_id,
              course_code: course.course_code,
              course_name: course.course_name,
              status: course.status,
              prerequisites: prereqResponse?.prerequisites?.map((p: any) => p.course_code) || [],
              corequisites: prereqResponse?.corequisites?.map((c: any) => c.course_code) || [],
            }
          } catch {
            // If prerequisites endpoint fails, return course without prereqs
            return {
              course_id: course.course_id,
              course_code: course.course_code,
              course_name: course.course_name,
              status: course.status,
              prerequisites: [],
              corequisites: [],
            }
          }
        })
      )
      
      setCourses(coursesWithPrereqs)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load prerequisite courses', error)
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCourses()
  }, [])

  const activeCourses = useMemo(
    () => courses.filter((course) => (course.status || 'active').toString().toLowerCase() === 'active'),
    [courses],
  )

  async function openConfig(course: CourseRecord) {
    setSelectedCourse(course)
    setShowModal(true)

    try {
      const response = await api.get(`/prerequisites/${course.course_id}`)
      const payload = response as DependencyResponse | undefined
      const prerequisiteCodes = uniqueValues(payload?.prerequisites?.map((item) => item.course_code) ?? [])
      const corequisiteCodes = uniqueValues(payload?.corequisites?.map((item) => item.course_code) ?? []).filter(
        (code) => !prerequisiteCodes.includes(code),
      )

      setSelectedPrereqCodes(prerequisiteCodes)
      setSelectedCoreqCodes(corequisiteCodes)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load prerequisite configuration', error)
      setSelectedPrereqCodes([])
      setSelectedCoreqCodes([])
    }
  }

  function closeConfig() {
    setShowModal(false)
    setSelectedCourse(null)
    setSelectedPrereqCodes([])
    setSelectedCoreqCodes([])
  }

  function toggleValue(values: string[], value: string) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
  }

  function uniqueValues(values: string[]) {
    return [...new Set(values)]
  }

  function togglePrerequisite(courseCode: string) {
    setSelectedPrereqCodes((current) => {
      const isAdding = !current.includes(courseCode)

      if (isAdding) {
        setSelectedCoreqCodes((other) => other.filter((code) => code !== courseCode))
      }

      return toggleValue(current, courseCode)
    })
  }

  function toggleCorequisite(courseCode: string) {
    setSelectedCoreqCodes((current) => {
      const isAdding = !current.includes(courseCode)

      if (isAdding) {
        setSelectedPrereqCodes((other) => other.filter((code) => code !== courseCode))
      }

      return toggleValue(current, courseCode)
    })
  }

  async function saveConfig() {
    if (!selectedCourse) return

    setIsSaving(true)
    try {
      const prerequisites = uniqueValues(selectedPrereqCodes)
      const corequisites = uniqueValues(selectedCoreqCodes).filter((code) => !prerequisites.includes(code))

      await api.put(`/prerequisites/${selectedCourse.course_id}`, {
        prerequisites,
        corequisites,
      })
      await loadCourses()
      closeConfig()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save prerequisite configuration', error)
      alert('Failed to save prerequisite configuration')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="pb-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-extrabold italic text-[#0f2147] tracking-tight">ACADEMIC PROGRAMS</h1>
          <p className="mt-2 text-sm text-[#0f2147]">ACADEMIC PROGRAM & CURRICULUM DEVELOPMENT PORTAL</p>

          <nav className="mt-6 flex gap-8 text-sm font-semibold">
            <NavTab to="/courses/oversight" label="PROPOSAL OVERSIGHT" />
            <NavTab to="/courses" label="ACADEMIC CATALOG" />
            {role !== 'Department Chair' && <NavTab to="/prerequisites" label="PREREQUISITE MANAGER" />}
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="rounded-[2rem] bg-[#fef9ec] p-4 sm:p-6 lg:p-8">
          <div className="rounded-[1.75rem] border border-[#dce6f4] bg-white px-6 py-8 shadow-[0_12px_28px_rgba(15,33,71,0.06)] sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div className="mb-8">
              <h2 className="text-[1.8rem] font-extrabold text-[#192544] sm:text-[2.1rem]">Academic Dependency Manager</h2>
              <p className="mt-2 max-w-4xl text-[0.78rem] font-medium uppercase tracking-[0.12em] text-[#66789c] sm:text-[0.82rem]">
                Define and manage course prerequisites and co-requisites to ensure academic flow integrity.
              </p>
            </div>

            <div className="space-y-5">
              {loading ? (
                <div className="rounded-[1.35rem] border border-[#dce6f4] bg-[#f7fbff] px-5 py-6 text-sm text-[#66789c] shadow-[0_8px_20px_rgba(15,33,71,0.03)] sm:px-6 sm:py-7">
                  Loading courses...
                </div>
              ) : activeCourses.length === 0 ? (
                <div className="rounded-[1.35rem] border border-[#dce6f4] bg-[#f7fbff] px-5 py-6 text-sm text-[#66789c] shadow-[0_8px_20px_rgba(15,33,71,0.03)] sm:px-6 sm:py-7">
                  No active courses found.
                </div>
              ) : (
                activeCourses.map((course) => (
                <div
                  key={course.course_id}
                  className="flex items-center justify-between gap-6 rounded-[1.35rem] border border-[#dce6f4] bg-[#f7fbff] px-5 py-6 shadow-[0_8px_20px_rgba(15,33,71,0.03)] sm:px-6 sm:py-7"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[1.05rem] font-extrabold text-[#192544] sm:text-[1.1rem]">{course.course_code} - {course.course_name}</h3>
                    
                    {/* Display Prerequisites and Corequisites */}
                    {course.prerequisites && course.prerequisites.length > 0 && (
                      <p className="mt-2 text-[0.75rem] text-[#66789c]">
                        <span className="font-semibold text-[#0f2147]">Prerequisites:</span> {course.prerequisites.join(', ')}
                      </p>
                    )}
                    {course.corequisites && course.corequisites.length > 0 && (
                      <p className="mt-1 text-[0.75rem] text-[#66789c]">
                        <span className="font-semibold text-[#0f2147]">Corequisites:</span> {course.corequisites.join(', ')}
                      </p>
                    )}
                    {(!course.prerequisites || course.prerequisites.length === 0) && (!course.corequisites || course.corequisites.length === 0) && (
                      <p className="mt-2 text-[0.75rem] text-[#9aa8c0] italic">
                        No dependencies configured
                      </p>
                    )}
                    
                    <div className="mt-3">
                      <span className="inline-flex items-center rounded-md border border-[#e4ebf7] bg-white px-2.5 py-1 text-[0.7rem] font-bold text-[#1b4dff] shadow-[0_4px_10px_rgba(15,33,71,0.03)]">
                        Manage prerequisites
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      onClick={() => void openConfig(course)}
                      className="rounded-2xl border border-[#dce3f1] bg-white px-6 py-3 text-sm font-semibold text-[#324160] shadow-[0_8px_18px_rgba(15,33,71,0.04)] transition-colors hover:border-[#c4d0e6] hover:text-[#0f2147]"
                    >
                      Configure Dependencies
                    </button>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && selectedCourse && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 sm:items-center sm:px-6">
            <div className="mx-auto max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100 sm:p-8">
              <div className="text-left">
                <h2 className="text-2xl font-bold text-[#0f2147]">Prerequisite Manager: {selectedCourse.course_code} - {selectedCourse.course_name}</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Select courses that must be completed before enrolling in {selectedCourse.course_code} - {selectedCourse.course_name}.
                </p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl bg-[#f7fbff] p-6">
                  <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-[#8d97b3]">Prerequisites</div>
                  <div className="space-y-3">
                    {activeCourses.filter((course) => course.course_id !== selectedCourse.course_id).map((course) => (
                      <label key={course.course_id} className="flex items-center gap-3 rounded-lg border border-[#e6eef6] bg-white p-3 text-sm text-[#0f2147]">
                        <input
                          type="checkbox"
                          checked={selectedPrereqCodes.includes(course.course_code)}
                          onChange={() => togglePrerequisite(course.course_code)}
                        />
                        <span className="font-semibold">{course.course_code}</span>
                        <span className="text-gray-400">{course.course_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-[#f7fbff] p-6">
                  <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-[#8d97b3]">Co-requisites</div>
                  <div className="space-y-3">
                    {activeCourses.filter((course) => course.course_id !== selectedCourse.course_id).map((course) => (
                      <label key={course.course_id} className="flex items-center gap-3 rounded-lg border border-[#e6eef6] bg-white p-3 text-sm text-[#0f2147]">
                        <input
                          type="checkbox"
                          checked={selectedCoreqCodes.includes(course.course_code)}
                          onChange={() => toggleCorequisite(course.course_code)}
                        />
                        <span className="font-semibold">{course.course_code}</span>
                        <span className="text-gray-400">{course.course_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={closeConfig} className="text-sm font-semibold tracking-widest text-gray-400">
                  Cancel
                </button>
                <button onClick={() => void saveConfig()} disabled={isSaving} className="rounded-xl bg-[#0f2147] px-6 py-3 text-yellow-400 shadow-md disabled:opacity-60">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

export default PrerequisiteManager
