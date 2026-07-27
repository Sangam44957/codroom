export default function RoomLoading() {
  return (
    <div className="min-h-screen bg-[#04040f] flex items-center justify-center">
      <div className="ambient-orbs">
        <div className="orb orb-violet" />
        <div className="orb orb-cyan" />
      </div>
      
      <div className="relative z-10 text-center">
        <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-lg">Loading room...</p>
      </div>
    </div>
  );
}