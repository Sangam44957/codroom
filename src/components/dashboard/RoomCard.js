"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Link2, ExternalLink, FileText, Clock, CheckCircle2, Sparkles, AlertCircle, StopCircle } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

const STATUS = {
  waiting:   { label: "Waiting",     cls: "text-slate-400 bg-white/[0.04] border-white/[0.08]" },
  active:    { label: "Live",        cls: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25" },
  completed: { label: "Completed",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  evaluated: { label: "Evaluated",   cls: "text-violet-400 bg-violet-500/10 border-violet-500/25" },
};

const DIFF = {
  easy:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  hard:   "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RoomCard({ room, liveCount, onDeleted }) {
  const router = useRouter();
  const [inviteCopied, setInviteCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  const status = STATUS[room.status] || STATUS.waiting;
  const isDone = room.status === "completed" || room.status === "evaluated";
  const hasReport = !!room.interview?.report;

  async function closeRoom(e) {
    e.stopPropagation();
    if (!confirm("Mark this interview as closed? This cannot be undone.")) return;
    setClosing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`/api/rooms/${room.id}`, { 
        method: "PATCH",
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        toast.success("Interview closed");
        // Optimistically update the card status
        room.status = "completed";
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Failed to close room");
      }
    } finally { setClosing(false); }
  }

  function openRoom(e) {
    e.stopPropagation();
    router.push(isDone ? `/room/${room.id}/report` : `/room/${room.id}`);
  }

  async function copyInviteLink(e) {
    e.stopPropagation();
    const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || window.location.origin;
    const url = `${base}/room/${room.id}?joinToken=${room.joinToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied!");
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1800);
    } catch { window.prompt("Copy invite link:", url); }
  }

  function deleteInterview(e) {
    e.stopPropagation();
    setShowConfirm(true);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`/api/rooms?roomId=${room.id}`, { 
        method: "DELETE",
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      if (res.ok) { setShowConfirm(false); onDeleted?.(room.id); toast.success("Room deleted"); }
      else toast.error("Delete failed.");
    } finally { setDeleting(false); }
  }

  return (
    <>
    <ConfirmModal
      open={showConfirm}
      title="Delete Interview?"
      description={`"${room.title}" and all its data will be permanently deleted. This cannot be undone.`}
      onConfirm={confirmDelete}
      onCancel={() => setShowConfirm(false)}
      loading={deleting}
    />
    <div className="group bg-[#0d0d18] border border-white/[0.07] hover:border-violet-500/30 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 flex flex-col">

      {/* Top color bar based on status */}
      <div className={`h-0.5 w-full ${
        liveCount > 0 ? "bg-gradient-to-r from-emerald-500 to-cyan-500" :
        room.status === "active" ? "bg-gradient-to-r from-cyan-500 to-blue-500" :
        hasReport ? "bg-gradient-to-r from-violet-500 to-cyan-500" :
        isDone ? "bg-gradient-to-r from-emerald-500 to-cyan-500" :
        "bg-white/[0.05]"
      }`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate leading-snug">
              {room.title}
            </h3>
            {room.candidateName && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Candidate: <span className="text-slate-400">{room.candidateName}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {liveCount > 0 ? (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border text-emerald-400 bg-emerald-500/10 border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {liveCount} in room
              </span>
            ) : (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${status.cls}`}>
                {status.label}
              </span>
            )}
          </div>
        </div>

        {/* Problem + language */}
        <div className="space-y-2 mb-4 flex-1">
          {room.problem ? (
            <div className="flex items-center gap-2 flex-wrap">
              <FileText size={11} className="text-slate-600 flex-shrink-0" />
              <span className="text-slate-400 text-xs truncate">{room.problem.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${DIFF[room.problem.difficulty] || "text-slate-400 bg-white/[0.04] border-white/[0.08]"}`}>
                {room.problem.difficulty}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FileText size={11} className="text-slate-600" />
              <span className="text-slate-600 text-xs">Free coding</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] text-slate-500 rounded">
              {room.language?.toUpperCase()}
            </span>
            <span className="flex items-center gap-1 text-slate-600 text-xs">
              <Clock size={10} /> {formatDate(room.createdAt)}
            </span>
          </div>

          {/* Report status */}
          <div className="pt-1">
            {hasReport ? (
              <span className="flex items-center gap-1.5 text-xs text-violet-400 font-medium">
                <Sparkles size={11} /> AI Report ready
              </span>
            ) : isDone ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 size={11} /> Interview completed
              </span>
            ) : room.interview ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-400">
                <AlertCircle size={11} /> In progress
              </span>
            ) : (
              <span className="text-xs text-slate-700">Not started</span>
            )}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05]">
          <button
            onClick={deleteInterview}
            disabled={deleting}
            title="Delete room"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all disabled:opacity-40 flex-shrink-0"
          >
            <Trash2 size={12} />
            {deleting ? "…" : "Delete"}
          </button>

          {/* Close / no-show — only for open rooms */}
          {!isDone && (
            <button
              onClick={closeRoom}
              disabled={closing}
              title="Close interview (no-show or early end)"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 rounded-lg transition-all disabled:opacity-40 flex-shrink-0"
            >
              <StopCircle size={12} />
              {closing ? "…" : "End"}
            </button>
          )}

          {/* Invite link */}
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-white/[0.06] hover:border-cyan-500/20 rounded-lg transition-all flex-shrink-0"
          >
            <Link2 size={12} />
            {inviteCopied ? "Copied!" : "Invite"}
          </button>

          {/* Open — primary action */}
          <button
            onClick={openRoom}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/25 hover:border-violet-500/40 rounded-lg transition-all"
          >
            <ExternalLink size={12} />
            {isDone ? "View Report" : "Open Room"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
