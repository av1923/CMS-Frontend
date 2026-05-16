import { useEffect, useState } from 'react'
import { Calendar, RefreshCcw, Search } from 'lucide-react'
import { api } from '@/utils/api'

type AuditEvent = {
  event: string
  timestamp: string
  course_id?: string | null
  course_code?: string | null
  course_name?: string | null
  user_id: string
  user_role: string
  changed_fields?: Record<string, unknown> | null
  ip_address?: string | null
}

function fmtDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function summarizeChanges(changedFields?: Record<string, unknown> | null) {
  if (!changedFields || Object.keys(changedFields).length === 0) {
    return 'No field details'
  }

  return Object.entries(changedFields)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' • ')
}

export function Reports() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eventTypeInput, setEventTypeInput] = useState('')
  const [activeEventType, setActiveEventType] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const pageSize = 20

  const loadEvents = async () => {
    setLoading(true)
    setError(null)

    try {
      // Try the audit-logs endpoint
      const response = await api.get('/audit-logs', {
        page,
        limit: pageSize,
        event_type: activeEventType.trim() || undefined,
      })

      setEvents(response?.events ?? [])
      setTotal(response?.total ?? response?.events?.length ?? 0)
      setLastUpdated(new Date().toISOString())
    } catch (requestError: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to load audit events', requestError)
      // Check if it's a 404 error (endpoint not found)
      if (requestError?.status === 404 || requestError?.message?.includes('not found')) {
        setError('Audit log endpoint not available. Please ensure the backend API supports audit logging.')
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load security logs')
      }
      setEvents([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [page, activeEventType, refreshKey])

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActiveEventType(eventTypeInput)
    setPage(1)
    setRefreshKey((value) => value + 1)
  }

  return (
    <div className="space-y-6">
      <header className="pb-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-[2.1rem] font-extrabold italic uppercase tracking-tight text-[#0f2147] sm:text-[2.3rem]">
            SECURITY AUDIT LOG
          </h1>
          <p className="mt-2 text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-[#6f7f9d]">
            HISTORICAL RECORD OF ALL SYSTEM CHANGES AND ADMINISTRATIVE EVENTS
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl rounded-[1.9rem] bg-[#fef9ec] p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <form className="flex flex-1 flex-wrap items-center gap-3" onSubmit={handleSubmit}>
            <div className="relative min-w-[16rem] flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3bd]" />
              <input
                value={eventTypeInput}
                onChange={(e) => setEventTypeInput(e.target.value)}
                placeholder="Filter by action, for example COURSE_CREATED"
                className="w-full rounded-full border border-[#dfe7f3] bg-white px-11 py-3 text-sm font-semibold text-[#0f2147] shadow-[0_8px_20px_rgba(15,33,71,0.05)] outline-none transition focus:border-[#b9c7de]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#0f2147] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_10px_20px_rgba(15,33,71,0.16)] transition hover:bg-[#163063]"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setEventTypeInput('')
                setActiveEventType('')
                setPage(1)
                setRefreshKey((value) => value + 1)
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#dfe7f3] bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-[#0f2147] shadow-[0_8px_20px_rgba(15,33,71,0.05)] transition hover:bg-[#f8fbff]"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </form>

          <div className="text-right text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#6f7f9d]">
            <div>{total} events total</div>
            <div>{lastUpdated ? `Updated ${fmtDate(lastUpdated)}` : 'Not updated yet'}</div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[#dfe7f3] bg-white shadow-[0_10px_26px_rgba(15,33,71,0.06)] overflow-hidden">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center px-6 py-10">
              <p className="text-[1.05rem] font-medium text-[#8d9abc] sm:text-[1.1rem]">Loading security logs...</p>
            </div>
          ) : error ? (
            <div className="flex min-h-[320px] items-center justify-center px-6 py-10 text-center">
              <div className="max-w-md space-y-3">
                <p className="text-[1.05rem] font-semibold text-[#8f3654]">Unable to load security logs</p>
                <p className="text-sm text-[#7c879f]">{error}</p>
                <button
                  type="button"
                  onClick={() => setRefreshKey((value) => value + 1)}
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#0f2147] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-white"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center px-6 py-10 text-center">
              <div className="max-w-md space-y-3">
                <p className="text-[1.05rem] font-semibold text-[#0f2147]">No audit events found</p>
                <p className="text-sm text-[#7c879f]">
                  {activeEventType.trim()
                    ? 'Try a different action name or clear the filter to view the full log history.'
                    : 'Audit events will appear here as courses, instructors, and sections are updated.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#f4f7fb]">
                  <th className="px-6 py-4 text-left text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#97a6c0]">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#97a6c0]">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#97a6c0]">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#97a6c0]">
                    Course / Resource
                  </th>
                  <th className="px-6 py-4 text-left text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#97a6c0]">
                    Details
                  </th>
                  <th className="px-6 py-4 text-right text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#97a6c0]">
                    Timestamp
                  </th>
                </tr>
              </thead>

              <tbody>
                {events.map((event, index) => (
                  <tr key={`${event.timestamp}-${event.user_id}-${event.event}-${index}`} className="border-t border-[#edf1f7] transition-colors hover:bg-[#f9fbfe]">
                    <td className="px-6 py-5 align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f7fb] text-[#9fb0cb] ring-1 ring-[#e6ecf6]">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 10-16 0" />
                            <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 11a4 4 0 100-8 4 4 0 000 8z" />
                          </svg>
                        </div>
                        <div className="min-w-0 text-[0.95rem] font-bold text-[#1a2340]">
                          {event.user_id}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 align-middle">
                      <span className="inline-flex rounded-md border border-[#dfe7f3] bg-[#f7f9fd] px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#51607d]">
                        {event.user_role || 'Unknown'}
                      </span>
                    </td>

                    <td className="px-6 py-5 align-middle">
                      <span className="inline-flex rounded-md border border-[#cdd7eb] bg-[#f5f7fd] px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-[#0f2147] shadow-[0_2px_8px_rgba(15,33,71,0.04)]">
                        {event.event}
                      </span>
                    </td>

                    <td className="px-6 py-5 align-middle">
                      <div className="min-w-0">
                        <div className="text-[0.98rem] font-extrabold uppercase tracking-tight text-[#1a2340]">
                          {event.course_code ? `${event.course_code} • ${event.course_name ?? 'Course event'}` : 'System event'}
                        </div>
                        <div className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#a5afc3]">
                          {event.course_id ? `Course ID: ${event.course_id}` : 'No course linked'}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 align-middle">
                      <div className="min-w-0 max-w-[22rem] text-[0.82rem] leading-6 text-[#51607d]">
                        {summarizeChanges(event.changed_fields)}
                      </div>
                    </td>

                    <td className="px-6 py-5 align-middle text-right">
                      <div className="inline-flex items-center gap-2 text-[0.9rem] text-[#9aa8c0]">
                        <Calendar className="h-4 w-4 text-[#bcc6d8]" />
                        <span>{fmtDate(event.timestamp)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f7] bg-[#fbfcfe] px-6 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a88a4]">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(value - 1, 1))}
                    disabled={!canGoPrev || loading}
                    className="rounded-full border border-[#dfe7f3] bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0f2147] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                    disabled={!canGoNext || loading}
                    className="rounded-full border border-[#dfe7f3] bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0f2147] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports
