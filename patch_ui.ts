import fs from 'fs';

const uiFile = 'src/components/AutoPilot.tsx';
let content = fs.readFileSync(uiFile, 'utf8');

const newUI = `
        {/* Module 3: Full Auto Campaign */}
        <div className="bg-stone-850 border border-violet-500/30 rounded-2xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-bold text-stone-200">Full Autonomous Campaign (1-Click)</h3>
          </div>
          <p className="text-xs text-stone-400">
            Clicking this will trigger a full background routine: 1. Research a new trending topic. 2. Write and Publish a live blog post. 3. Audit and update an older blog post with fresh SEO content.
          </p>

          <button
            onClick={async () => {
              if (!currentBlog) return alert("Select a blog");
              if (!currentBlog.niche) return alert("Set a niche in the Blog Manager first");
              setIsGenerating(true);
              try {
                const res = await fetch("/api/automation/run", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ blogId: currentBlog.id, niche: currentBlog.niche }),
                });
                const data = await res.json();
                if (res.ok) {
                  alert("Automation Complete!\\n\\nLog:\\n" + data.log.join("\\n"));
                } else {
                  alert("Error: " + data.error);
                }
              } catch (e: any) {
                alert("Error: " + e.message);
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating}
            className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGenerating ? "Running Full Automation Cycle..." : "Execute 1-Click Automation"}
          </button>
        </div>
`;

if (!content.includes('Full Auto Campaign')) {
  content = content.replace('      </div>\n\n    </div>', newUI + '\n      </div>\n\n    </div>');
}

fs.writeFileSync(uiFile, content);
console.log('Patched UI successfully');
