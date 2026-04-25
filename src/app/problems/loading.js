export default function ProblemsLoading() {
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
          <div className="skeleton h-5 w-32 mb-8 rounded-lg" />
          
          {/* Filters skeleton */}
          <div className="flex gap-4 mb-8">
            <div className="skeleton h-10 w-48 rounded-xl" />
            <div className="skeleton h-10 w-32 rounded-xl" />
            <div className="skeleton h-10 w-32 rounded-xl" />
          </div>
          
          {/* Problem cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="p-6 bg-white/[0.02] border border-white/[0.07] rounded-2xl">
                <div className="skeleton h-6 w-3/4 mb-3 rounded-lg" />
                <div className="skeleton h-4 w-full mb-2 rounded-lg" />
                <div className="skeleton h-4 w-2/3 mb-4 rounded-lg" />
                <div className="flex gap-2 mb-4">
                  <div className="skeleton h-6 w-16 rounded-full" />
                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}