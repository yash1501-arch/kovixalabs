import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NOW = new Date();

function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: "default-workspace" },
    update: {},
    create: { name: "Acme Corp", slug: "default-workspace" },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Alex Mercer" },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
  });

  const brand = await prisma.brand.upsert({
    where: { id: "seed-brand-default" },
    update: {},
    create: {
      id: "seed-brand-default",
      workspaceId: workspace.id,
      name: "NovaTech Solutions",
      description: "Next-gen enterprise SaaS platform for workflow automation.",
    },
  });

  await prisma.brandProfile.upsert({
    where: { brandId: brand.id },
    update: {},
    create: {
      brandId: brand.id,
      targetAudience: "CTOs, VPs of Engineering, IT Directors at mid-to-large enterprises",
      toneOfVoice: "Professional yet approachable. Use industry terminology but explain concepts clearly.",
      contentPillars: ["Product Innovation", "Engineering Culture", "Customer Success", "Industry Trends"],
      competitors: ["Asana", "Monday.com", "Jira"],
      restrictedTopics: ["Competitor bashing", "Unsubstantiated performance claims", "Financial projections"],
      approvedClaims: ["99.9% uptime SLA", "SOC 2 Type II certified", "50% faster workflow automation"],
      visualStyleNotes: "Clean, minimal design with blue (#2563EB) and gray palette. Use data visualizations and product screenshots.",
    },
  });

  const memoryEntries = [
    { title: "Brand Origin Story", content: "NovaTech was founded in 2020 by three ex-Google engineers who saw that enterprise workflow tools were too complex. Our mission is to make workflow automation accessible to every team, regardless of technical expertise.", tags: ["story", "founding", "mission"], source: "manual" },
    { title: "Key Differentiator", content: "Unlike competitors, NovaTech offers a no-code workflow builder with AI-powered suggestions. Users can automate complex processes in minutes, not weeks. Our visual editor reduces onboarding time by 70%.", tags: ["product", "differentiator", "ai"], source: "manual" },
    { title: "Customer Persona: CTO", content: "The CTO cares about: security compliance (SOC 2, GDPR), integration capabilities (API-first), scalability (handling millions of workflows), and ROI (reducing operational costs). Speak to technical sophistication and enterprise readiness.", tags: ["persona", "cto", "enterprise"], source: "manual" },
    { title: "Content Theme: Engineering Culture", content: "Showcase our engineering blog posts, open-source contributions, tech stack (TypeScript, Go, Rust), and team events. This builds credibility with technical audiences and helps recruiting.", tags: ["content", "engineering", "culture"], source: "manual" },
    { title: "Tone Guidelines", content: "Use 'we' not 'NovaTech'. Avoid jargon when possible. Lead with value proposition, then explain features. End posts with a question or CTA to drive engagement. Emojis: minimal — only use 👍 ✅ 🚀 in moderation.", tags: ["tone", "guidelines", "voice"], source: "manual" },
    { title: "Top Performing Post Formula", content: "Posts that combine a specific customer result (e.g., 'Reduced processing time by 60%') with a simple visual (chart or screenshot) consistently get 3x more engagement than text-only posts.", tags: ["insight", "performance", "formula"], source: "learning_engine" },
  ];

  for (const entry of memoryEntries) {
    await prisma.brandMemoryEntry.create({
      data: { workspaceId: workspace.id, brandId: brand.id, ...entry, tags: entry.tags },
    });
  }

  const platformIdeas = [
    { platform: "linkedin", caption: "Enterprise workflow automation isn't just about saving time — it's about enabling your team to focus on high-impact work. Our latest data shows teams using NovaTech reduce manual task time by 60% in the first quarter. What's one process you'd automate first?", status: "PUBLISHED", hashtags: ["#WorkflowAutomation", "#EnterpriseTech", "#Productivity"], publishedAt: daysAgo(5), scheduledAt: null },
    { platform: "twitter", caption: "We're hiring! Looking for a senior engineer who's passionate about developer experience. Build the tools that help thousands of teams work smarter. DM for details.", status: "PUBLISHED", hashtags: ["#hiring", "#engineering", "#devtools"], publishedAt: daysAgo(3), scheduledAt: null },
    { platform: "linkedin", caption: "Customer spotlight: How FinCorp reduced their invoice processing from 4 hours to 15 minutes using NovaTech's AI-powered workflow builder. The key was our intelligent document extraction + automated approval routing.", status: "PUBLISHED", hashtags: ["#CustomerStory", "#AIAutomation", "#FinTech"], publishedAt: daysAgo(1), scheduledAt: null },
    { platform: "twitter", caption: "Just released: NovaTech v3.2 with enhanced API integrations, real-time workflow monitoring, and our most requested feature — conditional branching in the visual editor. Update rolling out now. 🚀", status: "PUBLISHED", hashtags: ["#productupdate", "#SaaS"], publishedAt: daysAgo(0), scheduledAt: null },
    { platform: "linkedin", caption: "Why SOC 2 compliance matters for your workflow automation platform. We recently completed our annual audit with zero findings. Here's what we learned about building security into every layer.", status: "SCHEDULED", hashtags: ["#Security", "#SOC2", "#Compliance"], publishedAt: null, scheduledAt: daysFromNow(2) },
    { platform: "linkedin", caption: "5 signs your team needs workflow automation (beyond just 'we're busy'). Learn the diagnostic framework our solutions engineers use with enterprise prospects.", status: "DRAFT", hashtags: ["#WorkflowAutomation", "#Enterprise"], publishedAt: null, scheduledAt: null },
  ];

  for (const post of platformIdeas) {
    await prisma.post.create({
      data: {
        workspaceId: workspace.id,
        brandId: brand.id,
        platform: post.platform,
        status: post.status,
        caption: post.caption,
        hashtags: post.hashtags,
        mediaUrls: [],
        publishedAt: post.publishedAt ?? null,
        scheduledAt: post.scheduledAt ?? null,
      },
    });
  }

  const plan = await prisma.contentPlan.create({
    data: {
      workspaceId: workspace.id,
      brandId: brand.id,
      name: "Q3 LinkedIn Thought Leadership",
      platform: "linkedin",
      startDate: daysAgo(7),
      endDate: daysFromNow(23),
      postCount: 10,
      themes: ["Product Innovation", "Engineering Culture", "Customer Success"],
      status: "ACTIVE",
    },
  });

  const planTopics = ["The future of no-code automation", "Building resilience in engineering teams", "Customer success story: Enterprise onboarding", "AI in enterprise workflows", "Scaling engineering culture", "Security-first automation design", "ROI of workflow automation", "Developer experience trends", "Cross-functional collaboration at scale", "2026 enterprise tech predictions"];

  for (let i = 0; i < planTopics.length; i++) {
    await prisma.contentPlanItem.create({
      data: {
        planId: plan.id,
        day: i + 1,
        platform: "linkedin",
        topic: planTopics[i] ?? "Content post",
        caption: `Coming soon: ${planTopics[i] ?? "Content post"}. Share your thoughts in the comments.`,
        hashtags: ["#NovaTech", "#WorkflowAutomation", "#Enterprise"],
        scheduledDate: daysFromNow(i * 3),
        status: i < 3 ? "APPROVED" : "IDEA",
      },
    });
  }

  const newsSource = await prisma.newsSource.create({
    data: {
      workspaceId: workspace.id,
      brandId: brand.id,
      name: "TechCrunch AI",
      url: "https://techcrunch.com/category/artificial-intelligence/feed/",
      category: "AI & Tech",
      active: true,
      lastScrapedAt: daysAgo(1),
    },
  });

  const demoArticles = [
    { title: "Enterprise AI Adoption Surges in 2026", url: "https://example.com/enterprise-ai-2026", content: "New report shows 78% of enterprises have adopted AI in some form, up from 45% last year. Workflow automation leads the charge.", summary: "AI adoption in enterprises reaches 78%, driven by workflow automation and LLM integration.", author: "Sarah Chen", publishedAt: daysAgo(1), keywords: ["AI", "enterprise", "adoption"], relevanceScore: 0.85, sentiment: "positive" },
    { title: "No-Code Platforms Reshaping Enterprise Software", url: "https://example.com/nocode-enterprise", content: "The no-code movement is entering the enterprise, with platforms like NovaTech leading the charge. Gartner predicts 65% of app development will be no-code by 2028.", summary: "No-code platforms are transforming how enterprises build and deploy internal tools.", author: "Mike Rivera", publishedAt: daysAgo(2), keywords: ["nocode", "enterprise", "gartner"], relevanceScore: 0.92, sentiment: "positive" },
    { title: "Security Concerns Slow Cloud Migration for Financial Sector", url: "https://example.com/security-finance", content: "Financial institutions are proceeding cautiously with cloud migration, citing compliance and security concerns. SOC 2 and ISO 27001 certifications are becoming table stakes.", summary: "Financial sector faces security challenges in cloud migration.", author: "Alex Kim", publishedAt: daysAgo(3), keywords: ["security", "finance", "cloud", "compliance"], relevanceScore: 0.72, sentiment: "neutral" },
    { title: "Startup Funding: Automation Tools Raise $2B in Q2", url: "https://example.com/automation-funding", content: "Venture capital investment in workflow automation startups reached $2 billion in Q2 2026, marking a 40% increase year-over-year. Investors are betting on AI-powered efficiency.", summary: "Record VC investment in automation startups signals strong market demand.", author: "Priya Patel", publishedAt: daysAgo(5), keywords: ["funding", "automation", "startup", "vc"], relevanceScore: 0.88, sentiment: "positive" },
    { title: "The Great Resignation 2.0: Engineers Seek Meaningful Work", url: "https://example.com/great-resignation-engineers", content: "Software engineers are increasingly leaving big tech for startups and mission-driven companies. Culture and impact matter more than compensation for the current generation.", summary: "Engineers prioritize impact and culture over compensation in job selection.", author: "Jordan Lee", publishedAt: daysAgo(7), keywords: ["engineering", "hiring", "culture", "retention"], relevanceScore: 0.65, sentiment: "neutral" },
  ];

  for (const article of demoArticles) {
    await prisma.newsArticle.create({
      data: {
        workspaceId: workspace.id,
        sourceId: newsSource.id,
        brandId: brand.id,
        ...article,
      },
    });
  }

  await prisma.autopilotConfig.upsert({
    where: { workspaceId_brandId: { workspaceId: workspace.id, brandId: brand.id } },
    update: {},
    create: {
      workspaceId: workspace.id,
      brandId: brand.id,
      enabled: true,
      platforms: ["linkedin", "twitter"],
      postsPerWeek: 5,
      preferredTimes: ["09:00", "12:00", "17:00"],
      contentStyle: "educational",
      topicPreferences: ["Product Innovation", "Engineering Culture", "Industry Trends"],
      lastRanAt: daysAgo(2),
    },
  });

  await prisma.learningInsight.create({
    data: {
      workspaceId: workspace.id,
      brandId: brand.id,
      platform: "linkedin",
      type: "best_time",
      title: "Best Posting Time",
      description: "Posts published at 9:00 AM EST on Tuesdays and Thursdays receive 40% higher engagement.",
      confidence: 0.82,
      dataPoints: 45,
      recommendation: "Schedule important announcements for Tuesday 9:00 AM EST.",
    },
  });

  await prisma.learningInsight.create({
    data: {
      workspaceId: workspace.id,
      brandId: brand.id,
      platform: "linkedin",
      type: "best_content",
      title: "Best Performing Content",
      description: "Customer success stories and data-backed insights outperform product announcements by 3x. Posts with charts or infographics get 2x more shares.",
      confidence: 0.88,
      dataPoints: 32,
      recommendation: "Create more customer story content with data visualizations.",
    },
  });

  await prisma.learningInsight.create({
    data: {
      workspaceId: workspace.id,
      brandId: brand.id,
      platform: "twitter",
      type: "hashtag_performance",
      title: "Top Hashtags",
      description: "#WorkflowAutomation, #EnterpriseTech, and #DevTools consistently drive the most engagement. Avoid generic tags like #Technology or #Business.",
      confidence: 0.75,
      dataPoints: 28,
      recommendation: "Prioritize niche, industry-specific hashtags over broad ones.",
    },
  });

  await prisma.trend.create({
    data: {
      workspaceId: workspace.id,
      brandId: brand.id,
      platform: "twitter",
      keyword: "AI Agents",
      category: "technology",
      score: 92,
      velocity: 15,
      potential: 88,
      source: "twitter_trends",
      context: "AI agents that autonomously complete tasks are the hottest topic in enterprise tech. Multiple VC firms have announced dedicated AI agent funds.",
    },
  });

  await prisma.trend.create({
    data: {
      workspaceId: workspace.id,
      brandId: brand.id,
      platform: "twitter",
      keyword: "No-Code Enterprise",
      category: "technology",
      score: 78,
      velocity: 8,
      potential: 85,
      source: "twitter_trends",
      context: "No-code platforms are gaining enterprise traction as companies seek to reduce technical debt and empower citizen developers.",
    },
  });

  await prisma.imagePrompt.create({
    data: {
      workspaceId: workspace.id,
      brandId: brand.id,
      platform: "linkedin",
      topic: "AI workflow automation concept",
      aspectRatio: "1200x630",
      style: "corporate_clean",
      imageUrl: null,
      prompt: "A clean, modern visualization of interconnected workflow nodes with AI sparkles, blue and gray color palette, professional corporate style, data flowing through automated pipelines",
      negativePrompt: "text, people, cluttered, dark",
    },
  });

  console.log(`
  Seeded successfully:
    Workspace: ${workspace.id}
    User: admin@example.com
    Brand: ${brand.name} (${brand.id})
    Memory entries: ${memoryEntries.length}
    Posts: ${platformIdeas.length}
    Content plan items: ${planTopics.length}
    News articles: ${demoArticles.length}
    Learning insights: 3
    Trends: 2
    Image prompts: 1
  `);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
