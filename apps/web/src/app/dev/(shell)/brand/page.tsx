import { PageHeader } from "@/components/page-header";
import { BrandPreview } from "../../previews";

export default function DevBrand() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Brand kit"
        lead="Snip uses these for every slide, caption and Reel it makes for you."
      />
      <BrandPreview />
    </div>
  );
}
