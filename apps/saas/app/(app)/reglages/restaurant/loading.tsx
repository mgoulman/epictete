import { SkeletonHeader, SkeletonForm } from "@/components/ui/Skeleton";
export default function Loading() {
  return <div><SkeletonHeader /><SkeletonForm fields={6} /></div>;
}
