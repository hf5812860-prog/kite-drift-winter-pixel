import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const detail = error instanceof Error && error.message ? error.message : "";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#14120e] px-6 text-center text-[#f3efe4]">
      <span className="text-[#e2a23a]" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-3xl">الصفحة ما كملت التحميل</h1>
      <p className="max-w-md text-sm leading-relaxed text-[#b7ad9e]">
        صار انقطاع لحظة النشر. حدّث الصفحة مرة ثانية، وإذا ظلّت كذا امسح الكاش وارجع.
      </p>
      <button
        type="button"
        className="h-12 rounded-2xl bg-[#e2a23a] px-5 text-sm font-semibold text-[#14120e]"
        onClick={() => window.location.reload()}
      >
        حدّث الصفحة
      </button>
      {detail ? <p className="max-w-md break-words text-xs text-[#6f675c]">{detail}</p> : null}
    </main>
  );
}