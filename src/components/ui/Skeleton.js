"use client";

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="skeleton h-5 w-44 mb-2 rounded-xl" />
          <div className="skeleton h-4 w-28 rounded-lg" />
        </div>
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="flex gap-3 mb-5">
        <div className="skeleton h-4 w-20 rounded-lg" />
        <div className="skeleton h-4 w-16 rounded-lg" />
      </div>
      <div className="flex gap-2 pt-4 border-t border-white/[0.04]">
        <div className="skeleton h-8 flex-1 rounded-xl" />
        <div className="skeleton h-8 w-20 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonReport() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in">
      <div className="skeleton h-10 w-64 mb-3 rounded-xl" />
      <div className="skeleton h-5 w-48 mb-10 rounded-lg" />
      <div className="skeleton h-48 w-full rounded-3xl mb-8" />
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="skeleton h-64 rounded-3xl" />
        <div className="skeleton h-64 rounded-3xl" />
      </div>
      <div className="skeleton h-40 rounded-3xl" />
    </div>
  );
}
