import { GoogleGenAI } from "@google/genai";
import { loadConfig } from "../config.js";
import { db, run, all } from "../store.js";
import * as blogger from "../google/blogger.js";
import { generateAutoBlogPost } from "../ai/gemini.js";
import { fetchSerp } from "../serp/serp.js";

function getAi() {
  const cfg = loadConfig();
  if (!cfg.geminiApiKey) throw new Error("Gemini API key is required");
  return new GoogleGenAI({ apiKey: cfg.geminiApiKey });
}

export async function runAutomationCycle(blogId: number, niche: string) {
  const log: string[] = [];
  const pushLog = (msg: string) => {
    console.log(`[Auto] ${msg}`);
    log.push(msg);
  };

  pushLog(`Starting automation cycle for blog ID ${blogId}, niche: ${niche}`);

  const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
  if (!blog || !blog.blogger_blog_id) {
    pushLog("Error: Blog not found or lacks a linked Blogger ID");
    return { success: false, log };
  }

  // 1. Keyword Research & Edition Research
  pushLog("1. Edition Research: Finding new trending topic...");
  const ai = getAi();
  const topicPrompt = `Generate exactly ONE highly specific, low-competition long-tail keyword for a blog about "${niche}". 
Return ONLY the raw keyword phrase, no formatting, no quotes.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: topicPrompt,
  });
  
  let keyword = (response.text || "").trim().replace(/['"]/g, "");
  if (!keyword) keyword = `Best ${niche} tips`;
  pushLog(`Found target keyword: "${keyword}"`);

  // Try to grab SERP data for it
  try {
     const serp = await fetchSerp(keyword);
     pushLog(`Pulled SERP data for keyword. Found ${serp.results.length} top ranking competitors.`);
  } catch (e) {
     pushLog(`Skipped SERP live data (Serper might not be configured, or error). Using purely AI for drafting.`);
  }

  // 2. Write Blogs Published
  pushLog(`2. Auto-Blogger: Generating complete HTML blog post for "${keyword}"...`);
  const content = await generateAutoBlogPost(keyword, niche);
  pushLog(`Generated title: "${content.title}". Content length: ${content.htmlContent.length} chars.`);

  pushLog(`Pushing post directly to Blogger (LIVE)...`);
  const post = await blogger.insertPost({
    blogId: blog.blogger_blog_id,
    title: content.title,
    contentHtml: content.htmlContent,
    isDraft: false,
  });
  pushLog(`Published successfully! URL: ${post.url || ""}`);

  // Save to DB
  await run(
    `INSERT INTO posts (blog_id, title, url, blogger_post_id, stage, brief_md) VALUES (?, ?, ?, ?, ?, ?)`,
    [blogId, content.title, post.url || "", post.id || "", "published", `Automated post generation for: ${keyword}`]
  );

  // 3. Auto check blogs fix issues / update
  pushLog(`3. Auto-Check & Fix Issues: Fetching existing posts to audit...`);
  const recentPosts = await blogger.listPosts(blog.blogger_blog_id, 10, "LIVE");
  
  if (recentPosts.length > 1) { // > 1 so we don't pick the one we just published if possible
    // Pick a random older post
    const targetPost = recentPosts[recentPosts.length - 1]; 
    pushLog(`Selected older post for audit: "${targetPost.title}" (${targetPost.bloggerPostId})`);
    
    const postData = await blogger.getPost(blog.blogger_blog_id, targetPost.bloggerPostId);
    if (postData.content) {
      pushLog(`Auditing content length: ${postData.content.length} chars. Generating SEO updates...`);
      
      const updatePrompt = `You are an SEO editor. Analyze this blog post and return a small HTML snippet containing a new "FAQ" section to add at the bottom to improve its SEO ranking and semantic density.
Wrap it in a <div class="seo-updated-faq">...</div>.
Return ONLY valid HTML, no markdown codeblocks, no explanations.

Post Title: ${postData.title}
Post Content:
${postData.content.substring(0, 3000)}... (truncated)
`;
      const updateResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: updatePrompt,
      });

      let faqHtml = (updateResponse.text || "").trim();
      faqHtml = faqHtml.replace(/```html/g, "").replace(/```/g, "");

      if (faqHtml && faqHtml.includes("<div")) {
        pushLog(`Generated FAQ HTML. Appending to post...`);
        const updatedContent = postData.content + "\n<br/>\n" + faqHtml;
        
        await blogger.updatePost(blog.blogger_blog_id, targetPost.bloggerPostId, {
          content: updatedContent
        });
        pushLog(`Successfully updated and refreshed post: "${targetPost.title}"`);
      } else {
         pushLog(`AI failed to generate a valid HTML FAQ section. Skipping update.`);
      }
    } else {
      pushLog(`Post has no content to audit.`);
    }
  } else {
    pushLog(`Not enough existing posts found to perform historical audit/update.`);
  }

  pushLog(`Automation cycle completed successfully!`);
  return { success: true, log };
}
