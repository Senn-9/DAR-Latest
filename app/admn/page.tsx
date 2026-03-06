'use client'
import { useState, useEffect } from 'react'
import {
  RiEyeLine, RiInboxLine, RiCloseLine, RiCheckLine
} from 'react-icons/ri'
import { createClient } from '@/utils/supabase/client'
import { useAdminGuard } from '@/hooks/useAdminGuard'

type PRRecord = {
  id: string
  pr_no: string
  office_section: string
  resp_code: string
  purpose: string
  total_cost: number
  is_high_value: boolean
  status: string
  created_at: string
  items?: any[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-400',
  'in progress (bac)': 'bg-blue-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  completed: 'bg-gray-400',
}

function SuccessModal({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-2xl max-w-sm w-full">
        <div className="bg-green-600 px-6 py-4">
          <h2 className="text-white font-bold text-lg">Success</h2>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-5xl text-green-600 mb-4">✓</div>
            <p className="text-gray-700 text-sm">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

function ErrorModal({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-2xl max-w-sm w-full">
        <div className="bg-red-600 px-6 py-4">
          <h2 className="text-white font-bold text-lg">Error</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-700 text-sm mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function ViewPRModal({
  open,
  onClose,
  pr,
}: {
  open: boolean
  onClose: () => void
  pr?: PRRecord | null
}) {
  if (!open || !pr) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base tracking-wide">
              View Purchase Request
            </h2>
            <p className="text-emerald-200 text-xs mt-0.5">Appendix 60 · Official Government Form</p>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-8 bg-white">
          <div className="text-center mb-6">
            <p className="text-2xl font-bold text-black">PURCHASE REQUEST</p>
            <p className="text-xs text-black mt-1">Appendix 60</p>
          </div>

          <div className="space-y-4 mb-6 text-sm border-b-2 border-black pb-4">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-semibold text-xs text-black">PR NUMBER</p>
                <p className="text-black mt-1">{pr.pr_no || '—'}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-black">OFFICE / SECTION</p>
                <p className="text-black mt-1">{pr.office_section || '—'}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-black">RESP CODE</p>
                <p className="text-black mt-1">{pr.resp_code || '—'}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-black">STATUS</p>
                <p className="text-black capitalize mt-1">{pr.status || '—'}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="px-3 py-2 text-left font-semibold text-black">Description</th>
                  <th className="px-3 py-2 text-left font-semibold text-black">Stock No</th>
                  <th className="px-3 py-2 text-center font-semibold text-black">Unit</th>
                  <th className="px-3 py-2 text-center font-semibold text-black">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold text-black">Unit Cost</th>
                  <th className="px-3 py-2 text-right font-semibold text-black">Total</th>
                </tr>
              </thead>
              <tbody>
                {pr.items && pr.items.length > 0 ? (
                  pr.items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-black">
                      <td className="px-3 py-2 text-black">{item.description || '—'}</td>
                      <td className="px-3 py-2 text-black">{item.stock_no || '—'}</td>
                      <td className="px-3 py-2 text-center text-black">{item.unit || '—'}</td>
                      <td className="px-3 py-2 text-center text-black">{item.quantity || '0'}</td>
                      <td className="px-3 py-2 text-right text-black">₱{parseFloat(item.unit_price || '0').toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-black">₱{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-center text-black">No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-black mb-6">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-black">GRAND TOTAL</span>
              <span className="text-2xl font-bold text-black">₱{pr.total_cost.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t-2 border-black pt-4">
            <p className="font-semibold text-xs text-black mb-2">PURPOSE</p>
            <p className="text-black text-sm">{pr.purpose || '—'}</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Procurement() {
  const { authorized, loading: authLoading } = useAdminGuard()
  const supabase = createClient()

  const [records, setRecords] = useState<PRRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedPR, setSelectedPR] = useState<PRRecord | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [forwardingId, setForwardingId] = useState<string | null>(null)

  useEffect(() => {
    if (authorized) {
      fetchRecords()
    }
  }, [authorized])

  const fetchRecords = async () => {
    try {
      setIsLoading(true)
      
      const { data: prsData, error: prsError } = await supabase
        .from('purchase_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (prsError) throw prsError

      const prsWithItems = await Promise.all(
        (prsData || []).map(async (pr) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('purchase_request_items')
            .select('*')
            .eq('pr_id', pr.id)

          if (itemsError) {
            console.error(`Error fetching items for PR ${pr.id}:`, itemsError)
            return {
              ...pr,
              items: [],
            }
          }

          return {
            ...pr,
            items: itemsData || [],
          }
        })
      )

      const formatted: PRRecord[] = prsWithItems.map(pr => ({
        id: pr.id.toString(),
        pr_no: pr.pr_no,
        office_section: pr.office_section,
        resp_code: pr.resp_code || '',
        purpose: pr.purpose,
        total_cost: pr.total_cost || 0,
        is_high_value: pr.is_high_value || false,
        status: pr.status,
        created_at: pr.created_at,
        items: pr.items || [],
      }))

      console.log('Formatted records with items:', formatted)
      setRecords(formatted)
    } catch (err: any) {
      console.error('Error:', err?.message || err)
      setErrorMsg('Error loading PRs: ' + (err?.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignAndForward = async (pr: PRRecord) => {
    setForwardingId(pr.id)
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .update({
          status: 'in progress (bac)',
        })
        .eq('id', parseInt(pr.id))

      if (error) throw error

      await fetchRecords()
      setSuccessMsg('PR signed and forwarded to BAC successfully!')
    } catch (err: any) {
      console.error('Error:', err?.message || err)
      setErrorMsg('Error forwarding PR: ' + (err?.message || 'Unknown error'))
    } finally {
      setForwardingId(null)
    }
  }

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
  }

  if (!authorized) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 text-lg">Access Denied</div>
  }

  return (
    <>
      <ViewPRModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        pr={selectedPR}
      />

      <SuccessModal message={successMsg} onClose={() => setSuccessMsg(null)} />
      <ErrorModal message={errorMsg} onClose={() => setErrorMsg(null)} />

      <div className="flex flex-col gap-6 p-6 bg-gray-50 min-h-screen">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Purchase Request Dashboard</h1>
          <p className="text-gray-600 mt-1">Review and manage purchase requests</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['pending', 'in progress (bac)', 'approved', 'rejected'].map(status => {
            const count = records.filter(r => r.status.toLowerCase() === status.toLowerCase()).length
            const bgColor = status === 'pending' ? 'bg-yellow-50' : status === 'in progress (bac)' ? 'bg-blue-50' : status === 'approved' ? 'bg-emerald-50' : 'bg-red-50'
            const textColor = status === 'pending' ? 'text-yellow-700' : status === 'in progress (bac)' ? 'text-blue-700' : status === 'approved' ? 'text-emerald-700' : 'text-red-700'
            const borderColor = status === 'pending' ? 'border-yellow-200' : status === 'in progress (bac)' ? 'border-blue-200' : status === 'approved' ? 'border-emerald-200' : 'border-red-200'

            return (
              <div key={status} className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
                <p className={`text-sm font-semibold ${textColor} uppercase`}>{status}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{count}</p>
              </div>
            )
          })}
        </div>

        {isLoading ? (
          <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 p-8 text-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <RiInboxLine size={32} />
              <p className="text-sm">No purchase requests found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map(pr => (
              <div key={pr.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{pr.pr_no}</h3>
                    <p className="text-sm text-gray-600 mt-1">{pr.purpose}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full ${statusColors[pr.status.toLowerCase()] || 'bg-gray-300'} text-white text-xs font-semibold uppercase`}>
                    {pr.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Office</p>
                    <p className="text-gray-900 font-semibold">{pr.office_section}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Amount</p>
                    <p className="text-gray-900 font-semibold">₱{pr.total_cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Items</p>
                    <p className="text-gray-900 font-semibold">{pr.items?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Date</p>
                    <p className="text-gray-900 font-semibold">{new Date(pr.created_at).toLocaleDateString('en-PH')}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedPR(pr)
                      setViewModalOpen(true)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                  >
                    <RiEyeLine size={16} />
                    View
                  </button>
                  
                  {pr.status.toLowerCase() === 'pending' && (
                    <button
                      onClick={() => handleSignAndForward(pr)}
                      disabled={forwardingId === pr.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:bg-gray-400"
                    >
                      <RiCheckLine size={16} />
                      {forwardingId === pr.id ? 'Forwarding...' : 'Sign & Forward to BAC'}
                    </button>
                  )}

                  {pr.status.toLowerCase() === 'in progress (bac)' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                      <RiCheckLine size={16} />
                      Forwarded to BAC
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}