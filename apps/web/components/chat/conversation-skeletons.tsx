import { Skeleton } from '@/components/ui/skeleton';

export function ConversationSkeletons() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex gap-3 rounded-md p-2">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
