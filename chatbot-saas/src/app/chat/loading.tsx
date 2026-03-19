export default function ChatLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex gap-1">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
