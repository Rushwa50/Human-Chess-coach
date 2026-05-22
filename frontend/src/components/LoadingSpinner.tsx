export default function LoadingSpinner({ message = "Loading...", fullScreen = false }: { message?: string, fullScreen?: boolean }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6 text-slate-400">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full">
        {/* Outer glowing ring */}
        <div className="absolute inset-0 rounded-full border border-coach-accent/30 animate-[spin_4s_linear_infinite]">
          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-coach-accent shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
        </div>
        {/* Inner static piece */}
        <span className="text-2xl text-coach-accent animate-pulse-slow">♞</span>
      </div>
      <p className="font-medium tracking-wide text-coach-muted animate-pulse-slow">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center bg-coach-bg">
        {content}
      </div>
    );
  }

  return <div className="py-12 w-full flex items-center justify-center">{content}</div>;
}
