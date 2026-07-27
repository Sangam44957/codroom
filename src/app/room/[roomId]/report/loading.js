import { SkeletonReport } from "@/components/ui/Skeleton";

export default function ReportLoading() {
  return (
    <div className="min-h-screen bg-[#04040f]">
      <SkeletonReport />
    </div>
  );
}