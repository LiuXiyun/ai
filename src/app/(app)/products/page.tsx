import { Topbar } from "@/components/layout/Topbar";
import { ProductsClient } from "./ProductsClient";

export default function ProductsPage() {
  return (
    <>
      <Topbar title="Products" />
      <main className="flex-1 p-6">
        <ProductsClient />
      </main>
    </>
  );
}

