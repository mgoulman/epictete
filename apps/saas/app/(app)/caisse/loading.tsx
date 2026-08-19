import { SkeletonHeader, SkeletonForm } from "@/components/ui/Skeleton";
export default function Loading() {
  return <div><SkeletonHeader /><div className="grid gap-5 lg:grid-cols-[1fr_1fr_300px]"><SkeletonForm fields={4} /><SkeletonForm fields={3} /><SkeletonForm fields={3} /></div></div>;
}
