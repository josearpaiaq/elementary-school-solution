import { importCsv } from "@/app/actions/import";
import { requirePermission } from "@/lib/auth";
import { t } from "@/lib/strings";
import { btnPrimary, card, input } from "@/lib/ui";

type SearchParams = { imported?: string; skipped?: string; error?: string };

export default async function ImportPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("students:import");
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">{t.import.title}</h1>
      <p className="text-sm text-gray-700">{t.import.help}</p>
      <a href="/sample-import.csv" download className="text-sm text-blue-700 underline">
        {t.import.sample}
      </a>
      {searchParams.error && <p className="text-sm text-red-700">{t.import.invalid}</p>}
      {searchParams.imported && (
        <p className="text-sm text-green-700">
          {t.import.done(Number(searchParams.imported), Number(searchParams.skipped ?? 0))}
        </p>
      )}
      <form action={importCsv} className={`${card} space-y-4`}>
        <label className="block text-sm">
          {t.import.file}
          <input name="file" type="file" accept=".csv,text/csv" required className={input} />
        </label>
        <button className={btnPrimary}>{t.import.submit}</button>
      </form>
    </div>
  );
}
