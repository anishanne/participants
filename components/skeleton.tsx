const FILL = "rounded-lg bg-[rgba(59,28,28,0.1)]";
const RING = "rounded-full border-2 border-[rgba(59,28,28,0.1)]";

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse ${FILL} ${className ?? ""}`} />;
}

export function SkeletonTimelineRow({ isLast }: { isLast?: boolean }) {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-14 shrink-0 pt-2.5">
        <div className={`ml-auto h-3.5 w-12 ${FILL}`} />
      </div>
      <div className="flex flex-col items-center">
        <div className={`mt-2 h-5 w-5 ${RING}`} />
        {!isLast ? <div className="w-0.5 flex-1 bg-[rgba(59,28,28,0.06)]" /> : null}
      </div>
      <div className="mb-1 flex-1 rounded-xl px-3 py-2.5">
        <div className={`h-4 w-3/5 ${FILL}`} />
        <div className="mt-2 flex items-center gap-1.5">
          <div className={`h-3 w-3 rounded ${FILL}`} />
          <div className={`h-3 w-2/5 ${FILL}`} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAnnouncementCard() {
  return (
    <div className="panel p-5 space-y-3 animate-pulse">
      <div className={`h-3 w-28 ${FILL}`} />
      <div className={`h-5 w-3/4 ${FILL}`} />
      <div className="space-y-2">
        <div className={`h-3.5 w-full ${FILL}`} />
        <div className={`h-3.5 w-4/5 ${FILL}`} />
      </div>
    </div>
  );
}

export function SkeletonEventCard() {
  return (
    <div className="panel p-5 space-y-3 animate-pulse">
      <div className={`h-3 w-20 ${FILL}`} />
      <div className={`h-5 w-1/2 ${FILL}`} />
      <div className={`h-3.5 w-2/5 ${FILL}`} />
      <div className="flex gap-2 pt-1">
        <div className={`h-8 w-28 rounded-full ${FILL}`} />
        <div className={`h-8 w-24 rounded-full ${FILL}`} />
      </div>
    </div>
  );
}

export function SkeletonScheduleSlot() {
  return (
    <div className="rounded-[1.5rem] border border-[rgba(59,28,28,0.08)] bg-white/75 p-4 space-y-3 animate-pulse">
      <div className="grid gap-3 grid-cols-2">
        <div className="space-y-2">
          <div className={`h-3 w-12 ${FILL}`} />
          <div className={`h-10 w-full rounded-2xl ${FILL}`} />
        </div>
        <div className="space-y-2">
          <div className={`h-3 w-12 ${FILL}`} />
          <div className={`h-10 w-full rounded-2xl ${FILL}`} />
        </div>
      </div>
      <div className="space-y-2">
        <div className={`h-3 w-16 ${FILL}`} />
        <div className={`h-20 w-full rounded-2xl ${FILL}`} />
      </div>
    </div>
  );
}
