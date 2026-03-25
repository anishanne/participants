import { BottomNav } from "@/components/bottom-nav";

export default function ParticipantLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="px-0 md:px-6 md:py-6">
      <div className="relative mx-auto min-h-screen w-full max-w-md md:min-h-[calc(100vh-3rem)] md:overflow-hidden md:rounded-[2.75rem] md:border md:border-white/80 md:bg-[rgba(255,255,255,0.16)] md:shadow-[0_34px_90px_rgba(13,23,40,0.22)]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-5 md:min-h-[calc(100vh-3rem)]">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
