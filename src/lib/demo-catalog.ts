import type { DemoProduct, FaceAgeWidget } from "@/types/face-age";

/**
 * face-age 2.4.13 clears `productLists` inside `submitSkinAnalyze` and does not
 * restore a catalog passed to `setCustomProducts` before the photo was sent.
 * Results call `getAdvisorData` after that clear, which is the moment to put
 * the catalog back so product, cart, and checkout events can still fire.
 */
export function restoreCatalogAfterScan(widget: FaceAgeWidget, products: DemoProduct[]) {
  const globals = widget.w?.globals;
  if (!globals) return;
  const previous = globals.getAdvisorData;
  globals.getAdvisorData = (data: unknown) => {
    widget.API?.setCustomProducts?.(products);
    previous?.(data);
  };
}
