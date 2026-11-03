import { ActivateForm } from "./ActivateForm";
import { t } from "@/lib/strings";

export default function ActivatePage({ searchParams }: { searchParams: { code?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-2 text-2xl font-semibold">{t.activate.title}</h1>
      <p className="mb-6 text-gray-700">{t.activate.intro}</p>
      <ActivateForm code={searchParams.code ?? ""} />
    </main>
  );
}
