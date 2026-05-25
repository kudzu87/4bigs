export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#090d16] text-slate-200 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 font-black text-3xl mb-6">
        4
      </div>
      <h1 className="text-xl font-black mb-2">You&apos;re offline</h1>
      <p className="text-sm text-slate-400 max-w-xs">
        4 Bigs needs a connection to load updates. Your saved sessions on this device are still available when you reconnect.
      </p>
    </div>
  );
}
