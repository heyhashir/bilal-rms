import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, EmptyState, PageHeader } from "@/components/admin/primitives";
import { getErrorMessage } from "@/lib/api";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/admin/imports")({
  component: AdminImports,
});

type ImportResult = {
  count: number;
  successCount: number;
  failureCount: number;
  failures: Array<{ row: number; slug: string; message: string }>;
};

function AdminImports() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: diagnostics, refetch: refetchDiagnostics } = useQuery({
    queryKey: queryKeys.admin.fileMaintenance,
    queryFn: adminCatalogApi.uploadDiagnostics,
  });

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Launch data"
        title="Catalog import"
        description="Upload CSV/XLSX launch data, review per-row import failures, and scan for missing image or payment-proof files."
        action={
          <ActionButton variant="ghost" onClick={() => void refetchDiagnostics()}>
            Refresh file diagnostics
          </ActionButton>
        }
      />

      <div className="border border-border p-6">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Expected columns include <code>slug</code>, <code>name</code>, <code>description</code>, <code>category</code>, <code>brand</code>, <code>price</code>, <code>salePrice</code>, <code>stock</code>, <code>barcode</code>, <code>qrCode</code>, <code>supplierBarcode</code>, <code>commissionRate</code>, and JSON columns for <code>variants</code> or <code>colors</code>.
          </div>
          <label className="flex cursor-pointer items-center gap-3 border border-dashed border-border px-4 py-6">
            <Upload className="h-4 w-4" />
            <span className="text-sm">{file ? file.name : "Choose import file"}</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <ActionButton
              onClick={async () => {
                if (!file) {
                  toast.error("Choose a file first");
                  return;
                }

                try {
                  setLoading(true);
                  const payload = await adminCatalogApi.importCatalog(file);
                  setResult(payload);
                  toast.success(`Import processed ${payload.successCount} row${payload.successCount === 1 ? "" : "s"}`);
                } catch (error) {
                  toast.error(getErrorMessage(error, "Unable to import catalog"));
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "Importing..." : "Import catalog"}
            </ActionButton>
          </div>
        </div>
      </div>

      {result && (
        <div className="mt-5 border border-border">
          <div className="border-b border-border p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Last import run</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {result.successCount} successful, {result.failureCount} failed, {result.count} total rows processed.
            </div>
          </div>
          {result.failures.length === 0 ? (
            <EmptyState title="Import finished cleanly" hint="No row-level validation failures were reported." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-3 text-left">Row</th>
                    <th className="p-3 text-left">Slug</th>
                    <th className="p-3 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failures.map((failure) => (
                    <tr key={`${failure.row}-${failure.slug}`} className="border-t border-border">
                      <td className="p-3">{failure.row}</td>
                      <td className="p-3 font-medium">{failure.slug || "-"}</td>
                      <td className="p-3 text-muted-foreground">{failure.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="border border-border">
          <div className="border-b border-border p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Product image diagnostics</div>
            <div className="mt-2 text-sm text-muted-foreground">{diagnostics?.totals.productImages ?? 0} referenced product images.</div>
          </div>
          {diagnostics && diagnostics.missingProductImages.length > 0 ? (
            <div className="space-y-2 p-4 text-sm text-muted-foreground">
              {diagnostics.missingProductImages.map((path) => (
                <div key={path}>{path}</div>
              ))}
            </div>
          ) : (
            <EmptyState title="No missing product images" hint="All managed product-image file references currently resolve." />
          )}
          <div className="border-t border-border p-4 text-sm text-muted-foreground">
            Repair guidance: restore missing files from backup or update the affected products so the file path no longer points to a missing managed upload.
          </div>
        </section>

        <section className="border border-border">
          <div className="border-b border-border p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Payment proof diagnostics</div>
            <div className="mt-2 text-sm text-muted-foreground">{diagnostics?.totals.paymentProofs ?? 0} referenced payment proof files.</div>
          </div>
          {diagnostics && diagnostics.missingPaymentProofs.length > 0 ? (
            <div className="space-y-2 p-4 text-sm text-muted-foreground">
              {diagnostics.missingPaymentProofs.map((path) => (
                <div key={path}>{path}</div>
              ))}
            </div>
          ) : (
            <EmptyState title="No missing payment proofs" hint="All managed payment-proof file references currently resolve." />
          )}
          <div className="border-t border-border p-4 text-sm text-muted-foreground">
            Repair guidance: restore the original proof from backup or review the affected order and replace the broken file reference before relying on historical proof checks.
          </div>
        </section>
      </div>
    </div>
  );
}
