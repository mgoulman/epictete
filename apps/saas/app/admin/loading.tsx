import { SkeletonTiles, SkeletonTable } from "@/components/ui/Skeleton";
export default function Loading() {
  return <div className="space-y-6"><SkeletonTiles /><SkeletonTable cols={6} /></div>;
}
