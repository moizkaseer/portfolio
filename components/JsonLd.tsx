import { jsonLd } from "@/lib/seo";

/** Structured data, one <script type="application/ld+json"> per object. */
export function JsonLd({ data }: { data: object[] }) {
  return data.map((d, i) => (
    <script
      key={i}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(d) }}
    />
  ));
}
