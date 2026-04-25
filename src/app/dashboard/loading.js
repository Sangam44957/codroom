import { SkeletonDashboard } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#04040f]">
      <div className="ambient-orbs">
        <div className="orb orb-violet" />
        <div className="orb orb-cyan" />
      </div>
      
      <div className="relative z-10">
        {/* Navbar skeleton */}
        <div className="border-b border-white/[0.05] bg-[#04040f]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="skeleton h-8 w-32 rounded-xl" />
            <div className="skeleton h-10 w-10 rounded-full" />
          </div>
        </div>
        
        <main className="max-w-7xl mx-auto px-6 py-10">
          <div className="skeleton h-9 w-48 mb-2 rounded-xl" />
          <div className="skeleton h-5 w-32 mb-10 rounded-lg" />
          <SkeletonDashboard />
        </main>
      </div>
    </div>
  );
}