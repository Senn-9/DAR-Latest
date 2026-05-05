"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiCloseLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiUserLine,
  RiFileListLine,
  RiAddLine,
  RiDeleteBinLine,
} from "react-icons/ri";

interface ReleaseAndRecieveModalProps {
  prId: number;
  prNo: string;
  onClose: () => void;
  onProcessed?: (prId: number) => void;
}

type AssignmentRow = {
  id?: number;
  session_id: number | null;
  name_of_canvasser: string | null;
  quotation_no: string | null;
  rfq_index: number | null;
  released_at: string | null;
  returned_at: string | null;
  status: string | null;
  pr_no: string | null;
};

const inputCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-300";

export default function ReleaseAndRecieveModal({ prId, prNo, onClose, onProcessed }: ReleaseAndRecieveModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Get the latest Session for this PR
        let { data: session, error: sessFetchErr } = await supabase
          .from("canvass_sessions")
          .select("id")
          .eq("pr_id", prId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessFetchErr) throw sessFetchErr;

        if (!session) {
          const { data: newSession, error: sessErr } = await supabase
            .from("canvass_sessions")
            .insert({ pr_id: prId, stage: "Released", status: "active" })
            .select("id")
            .single();
          
          if (sessErr) throw sessErr;
          session = newSession;
        }
        setSessionId(session.id);

        // 2. Fetch assignments for this specific session
        const { data: asgs, error: asgErr } = await supabase
          .from("canvasser_assignments")
          .select("*")
          .eq("session_id", session.id)
          .order("id", { ascending: true });

        if (asgErr) throw asgErr;
        setAssignments(asgs || []);
      } catch (err: any) {
        console.error("Fetch error in ReleaseAndRecieveModal:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [prId, supabase]);

  const handleAddAssignment = async () => {
    if (!sessionId) return;
    setProcessing(true);
    try {
      const newAsg: AssignmentRow = {
        session_id: sessionId,
        pr_no: prNo,
        name_of_canvasser: "",
        quotation_no: "",
        rfq_index: 0,
        released_at: null,
        returned_at: null,
        status: "Pending",
      };
      const { data, error } = await supabase
        .from("canvasser_assignments")
        .insert(newAsg)
        .select()
        .single();
      
      if (error) throw error;
      setAssignments([...assignments, data]);
    } catch (err: any) {
      setError(err.message || "Failed to add assignment");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateAssignment = async (index: number, patch: Partial<AssignmentRow>) => {
    const asg = assignments[index];
    if (!asg.id) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("canvasser_assignments")
        .update(patch)
        .eq("id", asg.id);
      
      if (error) throw error;

      const newAsgs = [...assignments];
      newAsgs[index] = { ...newAsgs[index], ...patch };
      setAssignments(newAsgs);

      // Check if this update was a "Release" action
      if (patch.released_at) {
        const { error: prError } = await supabase.from("purchase_requests").update({
          status_id: 9,
          status: "Canvassing (Collection)"
        }).eq("id", prId);
        if (prError) throw prError;
        onProcessed?.(prId);
      }

      // Check if this update was a "Return" action
      if (patch.returned_at) {
        // We no longer automatically submit here
        onProcessed?.(prId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update assignment");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveAssignment = async (index: number) => {
    const asg = assignments[index];
    if (!asg.id) return;

    setProcessing(true);
    try {
      const { error } = await supabase.from("canvasser_assignments").delete().eq("id", asg.id);
      if (error) throw error;

      const newAsgs = assignments.filter((_, i) => i !== index);
      setAssignments(newAsgs);
    } catch (err: any) {
      setError(err.message || "Failed to delete assignment");
    } finally {
      setProcessing(false);
    }
  };

  const handleSetReleased = (index: number) => {
    handleUpdateAssignment(index, { 
      released_at: new Date().toISOString(),
      status: "Released"
    });
  };

  const handleSetReturned = (index: number) => {
    handleUpdateAssignment(index, { 
      returned_at: new Date().toISOString(),
      status: "Returned"
    });
  };

  const handleSubmitToAAA = async () => {
    setProcessing(true);
    setError(null);
    try {
      const { error: prError } = await supabase.from("purchase_requests").update({
        status_id: 10,
        status: "Abstract of Awards"
      }).eq("id", prId);
      
      if (prError) throw prError;
      onProcessed?.(prId);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit to Abstract of Awards");
    } finally {
      setProcessing(false);
    }
  };

  const allReturned = assignments.length > 0 && assignments.every(a => !!a.returned_at);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[80] bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-700 text-white">
          <div>
            <h2 className="text-xl font-bold">Release and Recieve</h2>
            <p className="text-xs opacity-80">PR No: {prNo}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <RiCloseLine /> {error}
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading assignments...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <RiUserLine className="text-emerald-600" /> Canvasser Assignments
                </h3>
                <button
                  onClick={handleAddAssignment}
                  disabled={processing}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <RiAddLine size={16} /> Add Assignment
                </button>
              </div>

              {assignments.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400">
                  <RiFileListLine size={40} className="opacity-20 mb-2" />
                  <p className="text-sm">No assignments yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((asg, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-4 relative">
                      <button
                        onClick={() => handleRemoveAssignment(idx)}
                        disabled={processing}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <RiDeleteBinLine size={18} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1">Canvasser Name</label>
                          <input
                            type="text"
                            className={`${inputCls} ${asg.released_at ? "bg-gray-100 cursor-not-allowed" : ""}`}
                            placeholder="Full Name"
                            value={asg.name_of_canvasser || ""}
                            disabled={!!asg.released_at}
                            onBlur={(e) => handleUpdateAssignment(idx, { name_of_canvasser: e.target.value })}
                            onChange={(e) => {
                              const newAsgs = [...assignments];
                              newAsgs[idx].name_of_canvasser = e.target.value;
                              setAssignments(newAsgs);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1">Quotation No.</label>
                          <input
                            type="text"
                            className={`${inputCls} ${asg.released_at ? "bg-gray-100 cursor-not-allowed" : ""}`}
                            placeholder="e.g. QTN-2026-001"
                            value={asg.quotation_no || ""}
                            disabled={!!asg.released_at}
                            onBlur={(e) => handleUpdateAssignment(idx, { quotation_no: e.target.value.trim() || null })}
                            onChange={(e) => {
                              const newAsgs = [...assignments];
                              newAsgs[idx].quotation_no = e.target.value;
                              setAssignments(newAsgs);
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1 text-center">Released At</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSetReleased(idx)}
                              disabled={!!asg.released_at || processing}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                asg.released_at
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                              } disabled:opacity-50`}
                            >
                              {asg.released_at ? (
                                <>
                                  <RiCheckboxCircleLine size={16} />
                                  {new Date(asg.released_at).toLocaleString()}
                                </>
                              ) : (
                                <>
                                  <RiTimeLine size={16} />
                                  Release Now
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1 text-center">Returned At</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSetReturned(idx)}
                              disabled={!asg.released_at || !!asg.returned_at || processing}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                asg.returned_at
                                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                                  : !asg.released_at
                                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              } disabled:opacity-50`}
                            >
                              {asg.returned_at ? (
                                <>
                                  <RiCheckboxCircleLine size={16} />
                                  {new Date(asg.returned_at).toLocaleString()}
                                </>
                              ) : (
                                <>
                                  <RiTimeLine size={16} />
                                  Return Now
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition-all shadow-sm"
          >
            Close
          </button>
          
          {allReturned && (
            <button
              onClick={handleSubmitToAAA}
              disabled={processing}
              className="px-6 py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-700/20 flex items-center gap-2"
            >
              {processing ? "Submitting..." : "Submit to Abstract of Awards"}
              <RiCheckboxCircleLine size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
