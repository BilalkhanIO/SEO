/**
 * JSON-LD generator — compensates for Blogger's missing plugin ecosystem.
 * Paste the output into the post HTML (HTML view) or the theme.
 */

export interface ArticleSchemaInput {
  headline: string;
  url: string;
  description?: string;
  imageUrl?: string;
  authorName: string;
  authorUrl?: string;
  datePublished: string; // ISO
  dateModified?: string;
}

export function articleSchema(a: ArticleSchemaInput): string {
  const obj = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.headline,
    url: a.url,
    ...(a.description ? { description: a.description } : {}),
    ...(a.imageUrl ? { image: [a.imageUrl] } : {}),
    author: {
      "@type": "Person",
      name: a.authorName,
      ...(a.authorUrl ? { url: a.authorUrl } : {}),
    },
    datePublished: a.datePublished,
    dateModified: a.dateModified || a.datePublished,
    mainEntityOfPage: { "@type": "WebPage", "@id": a.url },
  };
  return wrap(obj);
}

export function faqSchema(qa: { question: string; answer: string }[]): string {
  const obj = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.question,
      acceptedAnswer: { "@type": "Answer", text: x.answer },
    })),
  };
  return wrap(obj);
}

export function howToSchema(name: string, steps: { name: string; text: string }[]): string {
  const obj = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
  };
  return wrap(obj);
}

function wrap(obj: unknown): string {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}
