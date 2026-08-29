import fs from 'fs';

const serverFile = 'server.ts';
let content = fs.readFileSync(serverFile, 'utf8');

// Add import
if (!content.includes('import { runAutomationCycle }')) {
  content = content.replace(
    'import { loadConfig } from "./src/config.js";',
    'import { loadConfig } from "./src/config.js";\nimport { runAutomationCycle } from "./src/automation/routine.js";'
  );
}

// Add API Route
const routeStr = `
  app.post("/api/automation/run", async (req, res) => {
    try {
      const { blogId, niche } = req.body;
      if (!blogId || !niche) return res.status(400).json({ error: "blogId and niche required" });
      const result = await runAutomationCycle(blogId, niche);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message, log: ["Fatal error occurred", err.message] });
    }
  });
`;

if (!content.includes('/api/automation/run')) {
  content = content.replace('/* ------------------- API ROUTES ------------------- */', '/* ------------------- API ROUTES ------------------- */\n' + routeStr);
}

fs.writeFileSync(serverFile, content);
console.log('Patched server.ts successfully');
