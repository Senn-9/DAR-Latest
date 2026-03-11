'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  RiAddLine, RiInboxLine, RiCloseLine, RiDeleteBinLine,
  RiEditLine, RiArrowDownSLine, RiArrowUpSLine, RiEyeLine, RiDownloadCloud2Line,
} from 'react-icons/ri'
import { createClient } from '@/utils/supabase/client'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import SignOutButton from '@/components/SignOutButton'

type PRItem = {
  id?: string
  stockNo: string
  unit: string
  description: string
  quantity: string
  unitCost: string
}

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

const STATUS_OPTIONS = ['pending', 'approved', 'in progress', 'overdue', 'rejected', 'in progress (bac)']

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-400',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  'in progress': 'bg-blue-500',
  completed: 'bg-gray-400',
  'in progress (bac)': 'bg-blue-500',
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function emptyItem(): PRItem {
  return { id: uid(), stockNo: '', unit: '', description: '', quantity: '', unitCost: '' }
}

function getItemTotal(item: PRItem) {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0)
}

function getGrandTotal(items: PRItem[]) {
  return items.reduce((s, i) => s + getItemTotal(i), 0)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-300 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed'

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


function PRModal({
  open,
  onClose,
  onSave,
  editData,
  loading,
  mode = 'create',
}: {
  open: boolean
  onClose: () => void
  onSave: (pr: PRRecord) => void
  editData?: PRRecord | null
  loading: boolean
  mode?: 'create' | 'edit' | 'view'
}) {
  const [rec, setRec] = useState<{
    pr_no: string
    office_section: string
    resp_code: string
    purpose: string
    total_cost: string
    status: string
    items: PRItem[]
  }>({
    pr_no: '',
    office_section: '',
    resp_code: '',
    purpose: '',
    total_cost: '',
    status: 'pending',
    items: [emptyItem()],
  })
  const [tab, setTab] = useState<'form' | 'preview'>('form')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (editData) {
        setRec({
          pr_no: editData.pr_no,
          office_section: editData.office_section,
          resp_code: editData.resp_code,
          purpose: editData.purpose,
          total_cost: editData.total_cost.toString(),
          status: editData.status,
          items: editData.items?.map((i: any) => ({
            id: i.id?.toString(),
            stockNo: i.stock_no || '',
            unit: i.unit || '',
            description: i.description || '',
            quantity: i.quantity?.toString() || '',
            unitCost: i.unit_price?.toString() || '',
          })) || [emptyItem()],
        })
      } else {
        setRec({
          pr_no: '',
          office_section: '',
          resp_code: '',
          purpose: '',
          total_cost: '',
          status: 'pending',
          items: [emptyItem()],
        })
      }
      setTab('form')
    }
  }, [open, editData])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const set = (k: string, v: any) => setRec(r => ({ ...r, [k]: v }))
  const setItem = (id: string, k: string, v: string) =>
    setRec(r => ({
      ...r,
      items: r.items.map(i => (i.id === id ? { ...i, [k]: v } : i)),
    }))
  const addItem = () => setRec(r => ({ ...r, items: [...r.items, emptyItem()] }))
  const delItem = (id: string) =>
    setRec(r => ({
      ...r,
      items: r.items.length > 1 ? r.items.filter(i => i.id !== id) : r.items,
    }))

  const grandTotal = getGrandTotal(rec.items)

  const handleSave = async () => {
    if (!rec.pr_no || !rec.office_section) {
      alert('PR Number and Office Section are required')
      return
    }

    setSubmitting(true)
    try {
      const prData = {
        pr_no: rec.pr_no,
        office_section: rec.office_section,
        resp_code: rec.resp_code,
        purpose: rec.purpose,
        total_cost: grandTotal,
        is_high_value: grandTotal > 50000,
        status: rec.status,
        items: rec.items,
      }

      onSave({ ...prData, id: editData?.id || uid(), created_at: new Date().toISOString() } as PRRecord)
      onClose()
    } catch (err: any) {
      console.error('Error:', err?.message || err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base tracking-wide">
              {mode === 'view' ? 'View Purchase Request' : mode === 'edit' ? 'Update Purchase Request' : 'New Purchase Request'}
            </h2>
            <p className="text-emerald-200 text-xs mt-0.5">Appendix 60 · Official Government Form</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-emerald-500 mr-2">
              <button
                onClick={() => setTab('form')}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                  tab === 'form' ? 'bg-white text-emerald-700' : 'text-emerald-200 hover:text-white'
                }`}
              >
                Form
              </button>
              <button
                onClick={() => setTab('preview')}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                  tab === 'preview' ? 'bg-white text-emerald-700' : 'text-emerald-200 hover:text-white'
                }`}
              >
                Preview
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <RiCloseLine size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className={`flex flex-col overflow-hidden ${tab === 'form' ? 'flex-1' : 'hidden'} md:flex md:w-[420px] md:flex-none md:border-r border-gray-100`}>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {mode === 'edit' && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">
                    PR Number Assignment
                  </h3>
                  <div className="space-y-3">
                    <Field label="PR Number *">
                      <input
                        className={inputCls}
                        value={rec.pr_no}
                        onChange={e => set('pr_no', e.target.value)}
                        placeholder="PR-2024-001"
                      />
                    </Field>
                  </div>
                </section>
              )}

              {mode !== 'edit' && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">
                    Header Information
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="PR Number *">
                        <input
                          className={inputCls}
                          value={rec.pr_no}
                          onChange={e => set('pr_no', e.target.value)}
                          placeholder="PR-2024-001"
                          disabled={mode === 'view'}
                        />
                      </Field>
                      <Field label="Office / Section *">
                        <select
                          className={inputCls}
                          value={rec.office_section}
                          onChange={e => set('office_section', e.target.value)}
                          disabled={true}
                        >
                          <option value="">Select Office Section</option>
                          <option value="STOD">STOD</option>
                          <option value="BAC">BAC</option>
                          <option value="PARPO">PARPO</option>
                          <option value="LEGAL">LEGAL</option>
                          <option value="ARBDSP">ARBDSP</option>
                          <option value="LSTP">LSTP</option>
                          <option value="PARAD">PARAD</option>
                        </select>
                      </Field>
                    </div>
                    <Field label="Responsibility Center Code">
                      <input
                        className={inputCls}
                        value={rec.resp_code}
                        onChange={e => set('resp_code', e.target.value)}
                        placeholder="e.g. 10001"
                        disabled={true}
                      />
                    </Field>
                    <Field label="Status">
                      <select
                        className={inputCls}
                        value={rec.status}
                        onChange={e => set('status', e.target.value)}
                        disabled={true}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">
                  Items
                </h3>
                <div className="space-y-3">
                  {rec.items.map((item, idx) => (
                    <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Item {idx + 1}</span>
                      </div>
                      <Field label="Item Description">
                        <input
                          className={inputCls}
                          value={item.description}
                          onChange={() => {}}
                          placeholder="Describe the item"
                          disabled={true}
                        />
                      </Field>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Field label="Stock/Prop No.">
                          <input
                            className={inputCls}
                            value={item.stockNo}
                            onChange={() => {}}
                            placeholder="—"
                            disabled={true}
                          />
                        </Field>
                        <Field label="Unit">
                          <input
                            className={inputCls}
                            value={item.unit}
                            onChange={() => {}}
                            placeholder="pcs"
                            disabled={true}
                          />
                        </Field>
                        <Field label="Qty">
                          <input
                            className={inputCls}
                            type="number"
                            value={item.quantity}
                            onChange={() => {}}
                            placeholder="0"
                            disabled={true}
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Field label="Unit Cost">
                          <input
                            className={inputCls}
                            type="number"
                            value={item.unitCost}
                            onChange={() => {}}
                            placeholder="0.00"
                            disabled={true}
                          />
                        </Field>
                        <Field label="Total Cost">
                          <input
                            className={inputCls}
                            value={getItemTotal(item).toFixed(2)}
                            readOnly
                            style={{ background: '#f0fdf4', color: '#15803d', fontWeight: 600 }}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-3 py-2 bg-emerald-700 rounded-lg">
                    <span className="text-emerald-100 text-xs font-bold uppercase tracking-wide">Grand Total</span>
                    <span className="text-white font-bold text-sm">₱{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">
                  Remark
                </h3>
                <Field label="Remark">
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={rec.purpose}
                    onChange={e => set('purpose', e.target.value)}
                    placeholder="Add remarks..."
                    disabled={mode === 'view'}
                  />
                </Field>
              </section>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-2 flex-shrink-0">
              {mode === 'view' ? (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
                >
                  Close
                </button>
              ) : mode === 'edit' ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={submitting || loading}
                    className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition disabled:bg-gray-400"
                  >
                    {submitting ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={submitting || loading}
                    className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition disabled:bg-gray-400"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto bg-gray-100 p-6 ${tab === 'preview' ? 'block' : 'hidden'} md:block`}>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Live Preview</div>
            <div className="bg-white shadow-lg rounded-lg p-8 text-black max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <p className="text-2xl font-bold">PURCHASE REQUEST</p>
                <p className="text-xs text-gray-500 mt-1">Appendix 60</p>
              </div>

              <div className="space-y-4 mb-6 text-sm border-b pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-xs text-gray-600">PR NUMBER</p>
                    <p className="text-gray-900">{rec.pr_no || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-600">OFFICE / SECTION</p>
                    <p className="text-gray-900">{rec.office_section || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-600">RESP CODE</p>
                    <p className="text-gray-900">{rec.resp_code || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-600">STATUS</p>
                    <p className="text-gray-900 capitalize">{rec.status || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1 text-left">Description</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">Stock No</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">Unit</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">Qty</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Unit Cost</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rec.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 px-2 py-1">{item.description || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{item.stockNo || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{item.unit || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity || '0'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">₱{parseFloat(item.unitCost || '0').toFixed(2)}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">₱{getItemTotal(item).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">GRAND TOTAL</span>
                  <span className="text-2xl font-bold text-emerald-700">₱{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold text-xs text-gray-600 mb-2">REMARK</p>
                <p className="text-gray-900 text-sm">{rec.purpose || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Procurement() {
  const { authorized, loading: authLoading } = useAdminGuard()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState('purchase-request')
  const [mobileTab, setMobileTab] = useState(false)
  const [records, setRecords] = useState<PRRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [editData, setEditData] = useState<PRRecord | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setMobileTab(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (authorized) {
      fetchRecords()
    }
  }, [authorized])

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select(`
          *,
          purchase_request_items (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formatted: PRRecord[] = (data || []).map(pr => ({
        id: pr.id.toString(),
        pr_no: pr.pr_no,
        office_section: pr.office_section,
        resp_code: pr.resp_code || '',
        purpose: pr.purpose,
        total_cost: pr.total_cost || 0,
        is_high_value: pr.is_high_value || false,
        status: pr.status,
        created_at: pr.created_at,
        items: pr.purchase_request_items || [],
      }))

      setRecords(formatted)
    } catch (err: any) {
      console.error('Error:', err?.message || err)
      setErrorMsg('Error loading PRs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePR = useCallback(
    async (pr: PRRecord) => {
      try {
        const totalCost = pr.items?.reduce((sum, i) => {
          const qty = parseInt((i.quantity || i.qty || '0') as any)
          const price = parseFloat((i.unit_price || i.unitCost || '0') as any)
          return sum + (qty * price)
        }, 0) || 0

        const isUpdate = pr.id && records.some(r => r.id === pr.id)

        if (isUpdate && pr.id) {
          // Update PR
          const { error: updateError } = await supabase
            .from('purchase_requests')
            .update({
              pr_no: pr.pr_no,
            })
            .eq('id', parseInt(pr.id))

          if (updateError) throw updateError
        } else {
          // Create new PR
          const { data: prData, error: prError } = await supabase
            .from('purchase_requests')
            .insert([
              {
                pr_no: pr.pr_no,
                office_section: pr.office_section,
                resp_code: pr.resp_code,
                purpose: pr.purpose,
                total_cost: totalCost,
                is_high_value: totalCost > 50000,
                status: pr.status,
              }
            ])
            .select()

          if (prError) throw prError
          pr.id = prData[0].id.toString()
        }

        // Insert items - only after deletion is confirmed
        const itemsToInsert = pr.items
          ?.filter(i => i.description)
          .map(i => {
            const qty = parseInt((i.quantity || i.qty || '0') as any)
            const price = parseFloat((i.unit_price || i.unitCost || '0') as any)
            const subtotal = qty * price
            return {
              pr_id: parseInt(pr.id),
              description: i.description,
              stock_no: (i.stock_no || i.stockNo || '') as string,
              unit: (i.unit || '') as string,
              quantity: qty,
              unit_price: price,
              subtotal: subtotal,
            }
          }) || []

        if (itemsToInsert.length > 0 && !isUpdate) {
          const { error: itemError } = await supabase.from('purchase_request_items').insert(itemsToInsert)
          if (itemError) throw itemError
        }

        await fetchRecords()
        setEditData(null)
        setModalOpen(false)
        setSuccessMsg(isUpdate ? 'Purchase Request updated successfully!' : 'Purchase Request created successfully!')
      } catch (err: any) {
        console.error('Error:', err?.message || err)
        setErrorMsg('Error saving PR: ' + (err?.message || 'Unknown error'))
      }
    },
    [records]
  )

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
  }

  if (!authorized) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 text-lg">Access Denied</div>
  }

  return (
    <>
      <PRModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePR}
        editData={editData}
        loading={isLoading}
        mode={modalMode}
      />

      <SuccessModal message={successMsg} onClose={() => setSuccessMsg(null)} />
      <ErrorModal message={errorMsg} onClose={() => setErrorMsg(null)} />

      <div className="flex flex-col gap-6 p-6">
        {/* Top Tabs */}
        <div className="flex items-center gap-0 border-b border-gray-200">
          <button className="px-4 py-3 text-sm font-medium text-white bg-emerald-700 rounded-t-lg">
            PR
          </button>
          <button className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-emerald-700 hover:border-b-2 hover:border-emerald-700">
            PO
          </button>
          <button className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-emerald-700 hover:border-b-2 hover:border-emerald-700">
            Delivery
          </button>
          <button className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-emerald-700 hover:border-b-2 hover:border-emerald-700">
            Payment
          </button>
        </div>

        {/* Sub Tabs with Download Button */}
        <div className="flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-0">
            <button className="px-4 py-3 text-sm font-medium text-white bg-emerald-700">
              Purchase Request
            </button>
            <button className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-emerald-700">
              Canvass
            </button>
            <button className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-emerald-700">
              Abstract of Awards
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <RiInboxLine size={32} />
              <p className="text-sm">No purchase requests found</p>
            </div>
          </div>
        ) : (
          <div className="hidden md:block rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-700 text-white">
                  <th className="px-4 py-3 text-left font-semibold">PR No.</th>
                  <th className="px-4 py-3 text-left font-semibold">Office</th>
                  <th className="px-4 py-3 text-left font-semibold">Remark</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Date</th>
                  <th className="px-4 py-3 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((pr, idx) => (
                  <tr key={pr.id} className={`border-b border-gray-200 hover:bg-gray-300 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}>
                    <td className="px-4 py-3 text-gray-800 font-bold">{pr.pr_no}</td>
                    <td className="px-4 py-3 text-gray-700">{pr.office_section}</td>
                    <td className="px-4 py-3 text-gray-700">{pr.purpose}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₱{pr.total_cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-left justify-center gap-1.5 uppercase font-bold">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[pr.status] || 'bg-gray-400'}`} />
                        <span className="text-gray-600 text-xs">{pr.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-bold">{new Date(pr.created_at).toLocaleDateString('en-PH')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditData(pr)
                            setModalMode('view')
                            setModalOpen(true)
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-500 border border-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm"
                        >
                          <RiEyeLine size={14} />
                          View
                        </button>
                        <button
                          onClick={() => {
                            setEditData(pr)
                            setModalMode('edit')
                            setModalOpen(true)
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2 bg-amber-300 border border-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm"
                        >
                          <RiEditLine size={14} />
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {records.map(pr => (
            <div key={pr.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-800 text-sm">{pr.pr_no}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusColors[pr.status] || 'bg-gray-400'}`} />
                  <span className="text-xs text-gray-500">{pr.status}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-1 truncate">{pr.purpose}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{pr.office_section}</span>
                <span>{new Date(pr.created_at).toLocaleDateString('en-PH')}</span>
                <span>₱{pr.total_cost.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditData(pr)
                    setModalMode('view')
                    setModalOpen(true)
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-medium transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => {
                    setEditData(pr)
                    setModalMode('edit')
                    setModalOpen(true)
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded text-xs font-medium transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}