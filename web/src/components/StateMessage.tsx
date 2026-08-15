import { LucideIcon, Loader2 } from "lucide-react";

export function LoadingState({ label = "Yuklanmoqda..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink/50">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-ink/15 bg-white/60 py-16 text-center">
      <Icon className="h-9 w-9 text-ink/30" />
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink/50">{description}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl2 bg-red-50 py-16 text-center text-red-600">
      <p className="font-semibold">Nimadir xato ketdi</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}
