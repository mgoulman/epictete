import { SkeletonHeader, SkeletonTable } from "@/components/ui/Skeleton";
export default function Loading() {
  return <div><SkeletonHeader /><SkeletonTable cols={4} /></div>;
}
