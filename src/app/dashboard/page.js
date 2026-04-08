"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Play, TrendingUp, Clock, Sparkles } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import RoomCard from "@/components/dashboard/RoomCard";
import CreateRoomModal from "@/components/dashboard/CreateRoomModal";
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { fetchData(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData(p = 1) {
    try {
      const userRes = await fetch("/api/auth/me");
      if (!userRes.ok) { router.push("/login"); return; }
      const userData = await userRes.json();
      setUser(userData.user);
      const roomsRes = await fetch(`/api/rooms?page=${p}`);
      if (roomsRes.ok) {
        const d = await roomsRes.json();
        setRooms(d.rooms);
        setTotal(d.total ?? d.rooms.length);
        setTotalPages(d.totalPages ?? 1);
      }
    } catch { router.push("/login"); }
    finally { setLoading(false); }
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

          {/* Stats */}
          {rooms.length > 0 && (
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

          {/* Rooms */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
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
    </div>
  );
}
