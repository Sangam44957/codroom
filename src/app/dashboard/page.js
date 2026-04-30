"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Play, TrendingUp, Clock, Sparkles, LayoutTemplate, Trash2, Zap, GitBranch, Users } from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import Navbar from "@/components/ui/Navbar";
import RoomCard from "@/components/dashboard/RoomCard";
import CreateRoomModal from "@/components/dashboard/CreateRoomModal";
import CreateTemplateModal from "@/components/dashboard/CreateTemplateModal";
import CreatePipelineModal from "@/components/dashboard/CreatePipelineModal";
import { SkeletonDashboard } from "@/components/ui/Skeleton";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

const stagger = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const STAT_COLORS = {
  blue:    "from-blue-600/15 to-blue-600/0 border-blue-500/20 text-blue-400",
  emerald: "from-emerald-600/15 to-emerald-600/0 border-emerald-500/20 text-emerald-400",
  amber:   "from-amber-600/15 to-amber-600/0 border-amber-500/20 text-amber-400",
  violet:  "from-violet-600/15 to-violet-600/0 border-violet-500/20 text-violet-400",
};

function StatCard({ value, label, icon: Icon, color }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`p-6 rounded-2xl bg-gradient-to-br border ${STAT_COLORS[color]} backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm mb-1">{label}</p>
          <p className="text-4xl font-black text-white">
            <AnimatedCounter value={value} />
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-white/[0.05] ${STAT_COLORS[color].split(" ")[3]}`}>
          <Icon size={22} />
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("interviews"); // "interviews" | "templates"
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [liveCounts, setLiveCounts] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const roomsRef = useRef([]);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [deletingPipeline, setDeletingPipeline] = useState(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    
    // Get auth token from cookie for Socket.IO authentication
    const getAuthToken = () => {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'codroom-token') {
          return value;
        }
      }
      return null;
    };
    
    const authToken = getAuthToken();
    const socket = io(socketUrl, { 
      transports: ["websocket"], 
      reconnectionAttempts: 5,
      auth: {
        token: authToken
      }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      if (roomsRef.current.length > 0) {
        socket.emit("get-room-counts", roomsRef.current.map((r) => r.id));
      }
    });
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("room-counts-snapshot", (counts) => {
      setLiveCounts((prev) => ({ ...prev, ...counts }));
    });
    socket.on("room-count-update", ({ roomId, count }) => {
      setLiveCounts((prev) => ({ ...prev, [roomId]: count }));
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  const fetchData = useCallback(async (p = 1) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const [userRes, roomsRes] = await Promise.all([
        fetch("/api/auth/me", { signal: controller.signal }),
        fetch(`/api/rooms?page=${p}`, { signal: controller.signal })
      ]);
      
      if (!userRes.ok) { router.push("/login"); return; }
      const userData = await userRes.json();
      setUser(userData.user);
      
      if (roomsRes.ok) {
        const d = await roomsRes.json();
        setRooms(d.rooms);
        setTotal(d.total ?? d.rooms.length);
        setTotalPages(d.totalPages ?? 1);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        toast.error("Request timed out");
      } else {
        router.push("/login");
      }
    } finally { 
      clearTimeout(timeoutId);
      setLoading(false); 
    }
  }, [router]);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const res = await fetch("/api/templates", { signal: controller.signal });
      const data = await res.json();
      if (res.ok) setTemplates(data.templates);
    } catch (err) {
      if (err.name === "AbortError") {
        toast.error("Request timed out");
      }
    } finally { 
      clearTimeout(timeoutId);
      setLoadingTemplates(false); 
    }
  }, []);

  const fetchPipelines = useCallback(async () => {
    setLoadingPipelines(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const res = await fetch("/api/pipelines", { signal: controller.signal });
      const data = await res.json();
      if (res.ok) setPipelines(data.pipelines);
    } catch (err) {
      if (err.name === "AbortError") {
        toast.error("Request timed out");
      }
    } finally { 
      clearTimeout(timeoutId);
      setLoadingPipelines(false); 
    }
  }, []);

  // Keep roomsRef in sync and request counts whenever rooms load
  useEffect(() => {
    roomsRef.current = rooms;
    if (rooms.length > 0 && socketRef.current?.connected) {
      socketRef.current.emit("get-room-counts", rooms.map((r) => r.id));
    }
  }, [rooms]);

  useEffect(() => { fetchData(page); }, [page, fetchData]);

  useEffect(() => {
    if (activeTab === "templates" && templates.length === 0) fetchTemplates();
    if (activeTab === "pipelines" && pipelines.length === 0) fetchPipelines();
  }, [activeTab, templates.length, pipelines.length, fetchTemplates, fetchPipelines]);



  async function handleDeletePipeline(id) {
    if (!confirm("Delete this pipeline? Interviews will be detached.")) return;
    setDeletingPipeline(id);
    try {
      const res = await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Pipeline deleted"); setPipelines((p) => p.filter((pl) => pl.id !== id)); }
      else toast.error("Delete failed");
    } finally { setDeletingPipeline(null); }
  }


  async function handleDeleteTemplate(id) {
    if (!confirm("Delete this template?")) return;
    setDeletingTemplate(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Template deleted"); setTemplates((p) => p.filter((t) => t.id !== id)); }
      else toast.error("Delete failed");
    } finally { setDeletingTemplate(null); }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[#04040f]">
        <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
        <div className="relative z-10">
          <Navbar user={null} />
          <main className="max-w-7xl mx-auto px-6 py-10">
            <div className="skeleton h-9 w-48 mb-2 rounded-xl" />
            <div className="skeleton h-5 w-32 mb-10 rounded-lg" />
            <SkeletonDashboard />
          </main>
        </div>
      </div>
    );
  }

  const waiting   = rooms.filter((r) => r.status === "waiting").length;
  const active    = rooms.filter((r) => r.status === "active").length;
  const completed = rooms.filter((r) => r.status === "completed" || r.status === "evaluated").length;
  const evaluated = rooms.filter((r) => r.interview?.report).length;
  // Greeting by time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-[#04040f]">
      <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
      <div className="dot-grid fixed inset-0 pointer-events-none z-0 opacity-40" />

      <div className="relative z-10">
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="flex items-start justify-between mb-12"
          >
            <div>
              <p className="text-slate-500 text-sm mb-1">{greeting} 👋</p>
              <h1 className="text-4xl font-black text-white tracking-tight">
                Welcome back, <span className="gradient-text">{user?.name}!</span>
              </h1>
              <p className="text-slate-500 text-sm mt-2">
                {rooms.length === 0
                  ? "Create your first interview room to get started"
                  : `You have ${rooms.length} interview${rooms.length !== 1 ? "s" : ""} total`}
              </p>
            </div>
            <motion.button
              onClick={() => setShowModal(true)}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-2xl font-semibold shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40 transition-all"
            >
              <Plus size={18} /> New Interview
            </motion.button>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 p-1 bg-white/[0.02] rounded-2xl border border-white/[0.05] w-fit">
            {[["interviews", "Interviews"], ["templates", "Templates"], ["pipelines", "Pipelines"]].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === key
                    ? "bg-violet-600/20 border border-violet-500/40 text-violet-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}>{label}</button>
            ))}
          </div>

          {/* Stats */}
          {activeTab === "interviews" && rooms.length > 0 && (
            <motion.div
              variants={stagger}
              initial="initial"
              animate="animate"
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
            >
              <StatCard value={rooms.length} label="Total Interviews" icon={Play} color="blue" />
              <StatCard value={completed} label="Completed" icon={TrendingUp} color="emerald" />
              <StatCard value={active + waiting} label="In Progress" icon={Clock} color="amber" />
              <StatCard value={evaluated} label="AI Evaluated" icon={Sparkles} color="violet" />
            </motion.div>
          )}

          {/* Pipelines tab */}
          {activeTab === "pipelines" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Hiring Pipelines</h2>
                <motion.button onClick={() => setShowCreatePipeline(true)}
                  whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-violet-600/25 transition-all">
                  <Plus size={15} /> New Pipeline
                </motion.button>
              </div>

              {loadingPipelines ? (
                <div className="space-y-3">
                  {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
                </div>
              ) : pipelines.length === 0 ? (
                <div className="text-center py-32">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 flex items-center justify-center text-4xl">🎯</div>
                  <h2 className="text-2xl font-bold text-white mb-3">No pipelines yet</h2>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto">Group interviews for a role and compare candidates side-by-side.</p>
                  <motion.button onClick={() => setShowCreatePipeline(true)}
                    whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                    className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-2xl font-semibold shadow-lg shadow-violet-600/25 transition-all">
                    Create Pipeline
                  </motion.button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pipelines.map((pl) => (
                    <motion.div key={pl.id} whileHover={{ y: -3 }}
                      className="p-5 bg-white/[0.02] border border-white/[0.07] hover:border-violet-500/30 rounded-2xl transition-all">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">{pl.name}</p>
                          {pl.description && <p className="text-slate-500 text-xs mt-0.5 truncate">{pl.description}</p>}
                        </div>
                        <button onClick={() => handleDeletePipeline(pl.id)} disabled={deletingPipeline === pl.id}
                          className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all flex-shrink-0 disabled:opacity-40">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                          pl.status === "ACTIVE" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : pl.status === "PAUSED" ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                        }`}>{pl.status.toLowerCase()}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Users size={11} />{pl._count?.rooms ?? 0} interviews
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <GitBranch size={11} />Target: {pl.targetHires}
                        </span>
                      </div>
                      <button
                        onClick={() => router.push(`/pipelines/${pl.id}`)}
                        className="w-full py-2 text-xs font-semibold text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/10 transition-colors">
                        Compare Candidates →
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Templates tab */}
          {activeTab === "templates" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Templates</h2>
                <motion.button onClick={() => setShowCreateTemplate(true)}
                  whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-violet-600/25 transition-all">
                  <Plus size={15} /> New Template
                </motion.button>
              </div>

              {loadingTemplates ? (
                <div className="space-y-3">
                  {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-32">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 flex items-center justify-center text-4xl">📋</div>
                  <h2 className="text-2xl font-bold text-white mb-3">No templates yet</h2>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto">Save room presets to spin up interviews faster.</p>
                  <motion.button onClick={() => setShowCreateTemplate(true)}
                    whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                    className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-2xl font-semibold shadow-lg shadow-violet-600/25 transition-all">
                    Create Template
                  </motion.button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((t) => (
                    <motion.div key={t.id} whileHover={{ y: -3 }}
                      className="p-5 bg-white/[0.02] border border-white/[0.07] hover:border-violet-500/30 rounded-2xl transition-all">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">{t.name}</p>
                          {t.description && <p className="text-slate-500 text-xs mt-0.5 truncate">{t.description}</p>}
                        </div>
                        <button onClick={() => handleDeleteTemplate(t.id)} disabled={deletingTemplate === t.id}
                          className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all flex-shrink-0 disabled:opacity-40">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] text-slate-400 rounded-lg capitalize">{t.language}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500"><Clock size={11} />{t.durationMinutes}m</span>
                        {t.problemIds?.length > 0 && (
                          <span className="text-xs text-slate-500">{t.problemIds.length} problem{t.problemIds.length !== 1 ? "s" : ""}</span>
                        )}
                        {t.usageCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-600"><Zap size={11} />{t.usageCount} uses</span>
                        )}
                        {t.focusModeEnabled && (
                          <span className="text-xs px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">Focus</span>
                        )}
                        {t.defaultPipelineId && (
                          <span className="text-xs px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg">Auto-pipeline</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Rooms */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={activeTab !== "interviews" ? "hidden" : ""}>
            {rooms.length > 0 && (
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your Interviews</h2>
                <span className="text-slate-500 text-sm">{total} total</span>
              </div>
            )}

            {rooms.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center py-32"
              >
                <motion.div
                  className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 flex items-center justify-center text-4xl"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  🎙️
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-3">No interviews yet</h2>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                  Create your first room and invite a candidate with a single link.
                </p>
                <motion.button
                  onClick={() => setShowModal(true)}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-2xl font-semibold shadow-lg shadow-violet-600/25 transition-all"
                >
                  Create Interview Room
                </motion.button>
              </motion.div>
            ) : (
              <>
                <motion.div
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {rooms.map((room) => (
                    <motion.div key={room.id} variants={fadeUp}>
                      <RoomCard
                        room={room}
                        liveCount={liveCounts[room.id] ?? 0}
                        onDeleted={(id) => setRooms((p) => p.filter((r) => r.id !== id))}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-white/[0.07] hover:border-white/[0.14] rounded-xl disabled:opacity-30 transition-all"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 text-sm rounded-xl border transition-all ${
                          p === page
                            ? "bg-violet-600/30 border-violet-500/50 text-violet-300 font-semibold"
                            : "border-white/[0.07] text-slate-500 hover:text-white hover:border-white/[0.14]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-white/[0.07] hover:border-white/[0.14] rounded-xl disabled:opacity-30 transition-all"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </main>
      </div>

      <CreateRoomModal isOpen={showModal} onClose={() => setShowModal(false)} />
      {showCreateTemplate && (
        <CreateTemplateModal
          onClose={() => setShowCreateTemplate(false)}
          onCreated={(t) => { setTemplates((prev) => [t, ...prev]); setShowCreateTemplate(false); }}
        />
      )}
      {showCreatePipeline && (
        <CreatePipelineModal
          onClose={() => setShowCreatePipeline(false)}
          onCreated={(pl) => { setPipelines((prev) => [pl, ...prev]); setShowCreatePipeline(false); }}
        />
      )}
    </div>
  );
}
