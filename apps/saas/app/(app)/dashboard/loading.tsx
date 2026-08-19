import { SkeletonHeader, SkeletonTiles } from "@/components/ui/Skeleton";
export default function Loading() {
  return <div><SkeletonHeader /><SkeletonTiles /><div className="mt-4"><SkeletonTiles count={3} /></div></div>;
}
