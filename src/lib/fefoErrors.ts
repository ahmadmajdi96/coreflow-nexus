/**
 * Translate raw Postgres / Supabase error messages from the FEFO triggers
 * (`enforce_sale_fefo` and `apply_sale_return`) into friendly, field-level
 * error objects the UI can render next to batch / expiry / qty inputs.
 */
export type FefoFieldError = {
  field: "batch" | "expiry" | "quantity" | "product" | "general";
  title: string;
  detail: string;
  batch_number?: string;
};

export function parseFefoError(message: string | null | undefined): FefoFieldError {
  const msg = (message || "").trim();
  if (!msg) return { field: "general", title: "Unknown error", detail: "No message returned." };

  let m;
  if ((m = msg.match(/Cannot sell expired batch (\S+)\s*\(expired ([^)]+)\)/i))) {
    return { field: "expiry", batch_number: m[1], title: "Batch expired",
      detail: `Batch ${m[1]} expired on ${m[2]}. It cannot be sold.` };
  }
  if ((m = msg.match(/Cannot return to expired batch (\S+)\s*\(expired ([^)]+)\)/i))) {
    return { field: "expiry", batch_number: m[1], title: "Cannot credit expired batch",
      detail: `Batch ${m[1]} expired on ${m[2]}. Stock cannot be credited back to it.` };
  }
  if ((m = msg.match(/Batch (\S+) is not available \(status=(\w+)\)/i))) {
    return { field: "batch", batch_number: m[1], title: "Batch unavailable",
      detail: `Batch ${m[1]} status is ${m[2]} — only AVAILABLE batches can be sold.` };
  }
  if ((m = msg.match(/Requested qty (\S+) exceeds available (\S+) for batch (\S+)/i))) {
    return { field: "quantity", batch_number: m[3], title: "Quantity exceeds stock",
      detail: `Asked for ${m[1]} but batch ${m[3]} only has ${m[2]} available.` };
  }
  if ((m = msg.match(/Return qty (\S+) exceeds remaining returnable qty (\S+)/i))) {
    return { field: "quantity", title: "Return quantity too high",
      detail: `You can return at most ${m[2]} more on this line (tried ${m[1]}).` };
  }
  if (/Return batch must match original sale batch/i.test(msg)) {
    return { field: "batch", title: "Batch mismatch",
      detail: "The selected batch must match the batch on the original sale line." };
  }
  if (/Return product must match original sale product/i.test(msg)) {
    return { field: "product", title: "Product mismatch",
      detail: "The returned product must match the original sale line." };
  }
  if ((m = msg.match(/Batch (\S+) not found/i))) {
    return { field: "batch", batch_number: m[1], title: "Batch not found",
      detail: `Batch ${m[1]} no longer exists in inventory.` };
  }
  if (/Original sales item .* not found/i.test(msg)) {
    return { field: "general", title: "Original line missing",
      detail: "The original sales line could not be located. It may have been deleted." };
  }
  return { field: "general", title: "Operation blocked", detail: msg };
}
