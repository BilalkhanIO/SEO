import React, { useState } from "react";
import { Code, Copy, Check, Sparkles, Plus, Trash2 } from "lucide-react";

export const SchemaGenerator: React.FC = () => {
  const [schemaType, setSchemaType] = useState<"article" | "faq" | "howto">("article");
  const [copied, setCopied] = useState(false);

  // Article State
  const [headline, setHeadline] = useState("Ultimate Guide to Blogger SEO in 2026");
  const [url, setUrl] = useState("https://myblog.blogspot.com/2026/08/blogger-seo-guide.html");
  const [authorName, setAuthorName] = useState("Bilal Khan");
  const [authorUrl, setAuthorUrl] = useState("https://myblog.blogspot.com/p/about.html");
  const [description, setDescription] = useState("Step-by-step masterclass on optimizing Google Blogger for top search rankings.");
  const [imageUrl, setImageUrl] = useState("https://example.com/banner.jpg");
  const [datePublished, setDatePublished] = useState(new Date().toISOString().slice(0, 10));
  const [publisherName, setPublisherName] = useState("");
  const [publisherLogoUrl, setPublisherLogoUrl] = useState("");

  // FAQ State
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([
    { question: "Is Google Blogger good for SEO in 2026?", answer: "Yes, Blogger offers fast hosting, clean Core Web Vitals, and native Google Search Console integration." },
    { question: "How do I set a custom permalink in Blogger?", answer: "In the post editor sidebar under Post Settings, click 'Permalink' and select 'Custom Permalink' before publishing." },
  ]);

  // HowTo State
  const [howToName, setHowToName] = useState("How to Optimize a Blogger Post for SEO");
  const [howToSteps, setHowToSteps] = useState<{ name: string; text: string }[]>([
    { name: "Step 1: Perform Keyword Research", text: "Use autocomplete harvester to identify high-intent, low-competition keywords." },
    { name: "Step 2: Add JSON-LD Schema", text: "Generate structured data and paste it into the HTML view of the post." },
  ]);

  const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
  const removeFaq = (index: number) => setFaqs(faqs.filter((_, i) => i !== index));
  const updateFaq = (index: number, field: "question" | "answer", val: string) => {
    const next = [...faqs];
    next[index][field] = val;
    setFaqs(next);
  };

  const addStep = () => setHowToSteps([...howToSteps, { name: "", text: "" }]);
  const removeStep = (index: number) => setHowToSteps(howToSteps.filter((_, i) => i !== index));
  const updateStep = (index: number, field: "name" | "text", val: string) => {
    const next = [...howToSteps];
    next[index][field] = val;
    setHowToSteps(next);
  };

  const generateJsonLd = () => {
    if (schemaType === "faq") {
      const obj = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      };
      return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
    } else if (schemaType === "howto") {
      const obj = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: howToName,
        step: howToSteps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      };
      return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
    } else {
      const obj = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline,
        url,
        description,
        image: imageUrl ? [imageUrl] : undefined,
        author: {
          "@type": "Person",
          name: authorName,
          url: authorUrl || undefined,
        },
        publisher: publisherName
          ? {
              "@type": "Organization",
              name: publisherName,
              logo: publisherLogoUrl ? { "@type": "ImageObject", url: publisherLogoUrl } : undefined,
            }
          : undefined,
        datePublished: new Date(datePublished).toISOString(),
        dateModified: new Date().toISOString(),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": url,
        },
      };
      return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
    }
  };

  const schemaSnippet = generateJsonLd();

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-400" />
            JSON-LD Schema Markup Generator
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Compensate for Blogger's lack of SEO plugins. Generate rich snippet markup to paste into post HTML or theme templates.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-900 p-1 rounded-xl border border-stone-800">
          <button
            onClick={() => setSchemaType("article")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              schemaType === "article" ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            BlogPosting (Article)
          </button>
          <button
            onClick={() => setSchemaType("faq")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              schemaType === "faq" ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            FAQPage
          </button>
          <button
            onClick={() => setSchemaType("howto")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              schemaType === "howto" ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            HowTo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider text-xs">
              {schemaType === "article" ? "Article Attributes" : schemaType === "faq" ? "FAQ Q&A Pairs" : "HowTo Steps"}
            </h3>

            {schemaType === "article" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-300 mb-1">Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-300 mb-1">Canonical Post URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Author Name</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Date Published</label>
                    <input
                      type="date"
                      value={datePublished}
                      onChange={(e) => setDatePublished(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-300 mb-1">Short Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 resize-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-300 mb-1">Featured Image URL</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Publisher / Blog Name</label>
                    <input
                      type="text"
                      placeholder="e.g. My Blog"
                      value={publisherName}
                      onChange={(e) => setPublisherName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Publisher Logo URL</label>
                    <input
                      type="url"
                      placeholder="https://myblog.com/logo.png"
                      value={publisherLogoUrl}
                      onChange={(e) => setPublisherLogoUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 -mt-1">
                  Optional, but Google's Article rich-result guidelines want a publisher name + logo.
                </p>
              </div>
            )}

            {schemaType === "faq" && (
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">Question #{idx + 1}</span>
                      {faqs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFaq(idx)}
                          className="text-stone-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. What is the best permalink structure?"
                      value={faq.question}
                      onChange={(e) => updateFaq(idx, "question", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-200"
                    />
                    <textarea
                      placeholder="Answer text..."
                      value={faq.answer}
                      onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 resize-none"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFaq}
                  className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add FAQ Item
                </button>
              </div>
            )}

            {schemaType === "howto" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-300 mb-1">HowTo Guide Name</label>
                  <input
                    type="text"
                    value={howToName}
                    onChange={(e) => setHowToName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100"
                  />
                </div>

                {howToSteps.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-400">Step #{idx + 1}</span>
                      {howToSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="text-stone-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Step title"
                      value={step.name}
                      onChange={(e) => updateStep(idx, "name", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-200"
                    />
                    <textarea
                      placeholder="Step instructions..."
                      value={step.text}
                      onChange={(e) => updateStep(idx, "text", e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 resize-none"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addStep}
                  className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Step
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Code Preview (6 cols) */}
        <div className="lg:col-span-6 bg-stone-850 border border-stone-700/60 rounded-2xl p-5 flex flex-col h-[560px]">
          <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Generated JSON-LD Snippet
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Paste into Blogger's HTML view (at the very bottom of the post)
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>

          <textarea
            readOnly
            value={schemaSnippet}
            className="flex-1 w-full p-4 rounded-xl bg-stone-950 border border-stone-800 text-amber-300 font-mono text-xs leading-relaxed focus:outline-none resize-none overflow-y-auto select-all"
          />
        </div>
      </div>
    </div>
  );
};
