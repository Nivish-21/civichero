import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// NOTE: do not derive __dirname from import.meta.url here — the production
// bundle is CommonJS (esbuild --format=cjs), where import.meta.url is
// undefined and fileURLToPath() throws at startup.

// ---------------------------------------------------------------------------
// Input validation constants
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = new Set([
  "Pothole",
  "Water Leak",
  "Streetlight",
  "Garbage/Waste",
  "Drainage",
  "Road Damage",
  "Public Safety",
  "Other",
]);
const VALID_SEVERITIES = new Set(["Low", "Medium", "High"]);
const MAX_TEXT_LENGTH = 500;

// ---------------------------------------------------------------------------
// Exponential rate limiter — per IP, 8 AI calls/hour, 30 s base cooldown
// doubling after each call. In-memory; resets on server restart (fine for
// single-instance Cloud Run).
// ---------------------------------------------------------------------------
interface RateLimitEntry {
  count: number;
  windowStart: number;
  lastCallAt: number;
  cooldownSeconds: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_MAX_CALLS = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_BASE_COOLDOWN_S = 30;

function checkRateLimit(
  ip: string,
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, {
      count: 1,
      windowStart: now,
      lastCallAt: now,
      cooldownSeconds: 0,
    });
    return { allowed: true };
  }

  // Reset window after 1 hour
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, {
      count: 1,
      windowStart: now,
      lastCallAt: now,
      cooldownSeconds: 0,
    });
    return { allowed: true };
  }

  // Enforce per-call cooldown
  const secondsSinceLast = (now - entry.lastCallAt) / 1000;
  if (entry.cooldownSeconds > 0 && secondsSinceLast < entry.cooldownSeconds) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(entry.cooldownSeconds - secondsSinceLast),
    };
  }

  // Enforce hourly cap
  if (entry.count >= RATE_MAX_CALLS) {
    const windowResetSeconds = Math.ceil(
      (RATE_WINDOW_MS - (now - entry.windowStart)) / 1000,
    );
    return { allowed: false, retryAfterSeconds: windowResetSeconds };
  }

  // Next cooldown doubles (cap at 1 hour)
  const nextCooldown =
    entry.cooldownSeconds === 0
      ? RATE_BASE_COOLDOWN_S
      : Math.min(entry.cooldownSeconds * 2, 3600);

  rateLimitMap.set(ip, {
    count: entry.count + 1,
    windowStart: entry.windowStart,
    lastCallAt: now,
    cooldownSeconds: nextCooldown,
  });
  return { allowed: true };
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

// ---------------------------------------------------------------------------
// Agentic Resolution Layer — types + simulation helper
// ---------------------------------------------------------------------------
interface AgentIssueInput {
  id?: string;
  category: string;
  severity?: string;
  summary?: string;
  userNote?: string;
  address?: string;
  upvotes?: number;
}

interface NearbyIssue {
  id: string;
  category: string;
  summary?: string;
  status?: string;
  distanceMeters?: number;
}

const CATEGORY_AUTHORITY: Record<string, string> = {
  Pothole: "Municipal Roads & Public Works Department",
  "Road Damage": "Municipal Roads & Public Works Department",
  "Water Leak": "Water Supply & Sewerage Board",
  Drainage: "Storm Water Drainage Department",
  Streetlight: "Municipal Electrical / Street Lighting Department",
  "Garbage/Waste": "Solid Waste Management Department",
  "Public Safety": "Municipal Safety & Disaster Response Cell",
  Other: "Municipal Grievance Redressal Cell",
};

function buildSimulatedPlan(issue: AgentIssueInput, nearby: NearbyIssue[]) {
  const severity = issue.severity || "Medium";
  const base = severity === "High" ? 80 : severity === "Medium" ? 55 : 30;
  const priorityScore = Math.min(
    100,
    base + Math.min((issue.upvotes || 0) * 3, 15),
  );
  const slaDays = severity === "High" ? 2 : severity === "Medium" ? 5 : 10;
  const dup = nearby.find((n) => n.category === issue.category) || null;
  const authority =
    CATEGORY_AUTHORITY[issue.category] || CATEGORY_AUTHORITY.Other;

  return {
    authority,
    authorityReason: `${issue.category} issues fall under the remit of the ${authority}.`,
    duplicateOfId: dup ? dup.id : null,
    duplicateReason: dup
      ? `A nearby "${dup.category}" report (#${dup.id.slice(0, 8)}) likely describes the same problem.`
      : "No closely matching nearby report found; treated as a new issue.",
    priorityScore,
    slaDays,
    draftReport:
      `To: ${authority}\n` +
      `Subject: Civic issue report — ${issue.category} (${severity} severity)\n\n` +
      `Dear Sir/Madam,\n\n` +
      `A ${severity.toLowerCase()}-severity ${issue.category.toLowerCase()} issue has been reported at ` +
      `${issue.address || "the indicated location"}. ${issue.summary || ""}` +
      `${issue.userNote ? " Citizen note: " + issue.userNote : ""}\n\n` +
      `We request inspection and resolution within ${slaDays} days.\n\n` +
      `Submitted via Community Hero.`,
    recommendedActions: [
      `Forward to ${authority} for inspection.`,
      `Target resolution within ${slaDays} days given ${severity} severity.`,
      dup
        ? "Merge with the matching nearby report to avoid duplicate dispatch."
        : "Monitor for additional citizen verifications before dispatch.",
    ],
    isSimulated: true,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // ---------------------------------------------------------------------------
  // POST /api/triage — Gemini Vision multimodal triage
  // ---------------------------------------------------------------------------
  app.post("/api/triage", async (req, res) => {
    try {
      const { image } = req.body;

      if (!image || typeof image !== "string" || image.trim() === "") {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Apply rate limiting
      const ip = getClientIp(req);
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          retryAfterSeconds: rl.retryAfterSeconds,
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn("GEMINI_API_KEY missing — returning simulated triage.");
        const categories = [
          "Pothole",
          "Water Leak",
          "Streetlight",
          "Garbage/Waste",
          "Drainage",
          "Road Damage",
          "Public Safety",
          "Other",
        ];
        return res.json({
          category: categories[Math.floor(Math.random() * categories.length)],
          severity: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
          summary: "Simulated: Civic issue identified in the submitted image.",
          isSimulated: true,
        });
      }

      // Validate image is a data URL
      if (!image.startsWith("data:image/")) {
        return res
          .status(400)
          .json({ error: "Image must be a valid data URL (data:image/...)" });
      }

      let mimeType = "image/jpeg";
      let base64Data = image;

      const parts = image.split(";base64,");
      if (parts.length === 2) {
        mimeType = parts[0].replace("data:", "");
        base64Data = parts[1];
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `Analyze this image of a municipal, infrastructure, or civic issue in a neighborhood.
You are a smart civic assistant triage model.
Return a structured JSON output with the following properties:
1. "category": Must be strictly one of: "Pothole", "Water Leak", "Streetlight", "Garbage/Waste", "Drainage", "Road Damage", "Public Safety", "Other".
2. "severity": Must be strictly one of: "Low", "Medium", "High".
3. "summary": A concise, clear, one-line summary describing the visible issue (maximum 12 words).`,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              category: {
                type: "STRING",
                enum: [
                  "Pothole",
                  "Water Leak",
                  "Streetlight",
                  "Garbage/Waste",
                  "Drainage",
                  "Road Damage",
                  "Public Safety",
                  "Other",
                ],
              },
              severity: { type: "STRING", enum: ["Low", "Medium", "High"] },
              summary: { type: "STRING" },
            },
            required: ["category", "severity", "summary"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty response from Gemini API");

      const parsed = JSON.parse(responseText);
      return res.json({ ...parsed, isSimulated: false });
    } catch (error: unknown) {
      console.error("Error during Gemini triage:", error);
      return res.status(500).json({
        error: "Triage failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/agent/resolve — Agentic Resolution Layer
  // ---------------------------------------------------------------------------
  app.post("/api/agent/resolve", async (req, res) => {
    try {
      const { issue, nearbyIssues } = req.body as {
        issue?: AgentIssueInput;
        nearbyIssues?: NearbyIssue[];
      };

      if (!issue || !issue.category) {
        return res
          .status(400)
          .json({ error: "issue (with category) is required" });
      }

      // Validate enum inputs
      const category = String(issue.category).trim();
      if (!VALID_CATEGORIES.has(category)) {
        return res.status(400).json({
          error: `Invalid category. Must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
        });
      }
      if (issue.severity && !VALID_SEVERITIES.has(String(issue.severity))) {
        return res.status(400).json({
          error: `Invalid severity. Must be one of: ${[...VALID_SEVERITIES].join(", ")}`,
        });
      }

      // Sanitise text fields
      const sanitisedIssue: AgentIssueInput = {
        ...issue,
        category,
        summary: issue.summary
          ? String(issue.summary).trim().slice(0, MAX_TEXT_LENGTH)
          : undefined,
        userNote: issue.userNote
          ? String(issue.userNote).trim().slice(0, MAX_TEXT_LENGTH)
          : undefined,
        address: issue.address
          ? String(issue.address).trim().slice(0, 200)
          : undefined,
      };

      const nearby = Array.isArray(nearbyIssues)
        ? nearbyIssues.slice(0, 10)
        : [];
      const apiKey = process.env.GEMINI_API_KEY;

      // Apply rate limiting
      const ip = getClientIp(req);
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          retryAfterSeconds: rl.retryAfterSeconds,
        });
      }

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn("GEMINI_API_KEY missing — returning simulated agent plan.");
        return res.json(buildSimulatedPlan(sanitisedIssue, nearby));
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            text: `You are an autonomous civic resolution agent for a hyperlocal issue-reporting platform.
A citizen has reported an issue. Plan its resolution end to end.

REPORTED ISSUE (JSON):
${JSON.stringify(sanitisedIssue)}

NEARBY EXISTING ISSUES — candidate duplicates (JSON array; may be empty):
${JSON.stringify(nearby)}

Do all of the following and return strict JSON:
1. "authority": the specific municipal department/authority responsible for resolving this category of issue.
2. "authorityReason": one sentence on why that authority owns it.
3. "duplicateOfId": if one of the NEARBY issues describes the same real-world problem, return its "id"; otherwise return the literal string "none".
4. "duplicateReason": one sentence explaining the duplicate decision.
5. "priorityScore": integer 0-100 combining severity, category risk, and upvotes (higher = more urgent).
6. "slaDays": integer target resolution time in days (urgent issues are smaller).
7. "draftReport": a concise, formal complaint letter to the authority citing the specifics, ready to send.
8. "recommendedActions": an array of 2-3 short, concrete next steps.`,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              authority: { type: "STRING" },
              authorityReason: { type: "STRING" },
              duplicateOfId: { type: "STRING" },
              duplicateReason: { type: "STRING" },
              priorityScore: { type: "INTEGER" },
              slaDays: { type: "INTEGER" },
              draftReport: { type: "STRING" },
              recommendedActions: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: [
              "authority",
              "authorityReason",
              "duplicateOfId",
              "duplicateReason",
              "priorityScore",
              "slaDays",
              "draftReport",
              "recommendedActions",
            ],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty response from Gemini agent");

      const parsed = JSON.parse(responseText);
      const duplicateOfId =
        parsed.duplicateOfId && parsed.duplicateOfId !== "none"
          ? parsed.duplicateOfId
          : null;

      return res.json({ ...parsed, duplicateOfId, isSimulated: false });
    } catch (error: unknown) {
      console.error("Error during agent resolve:", error);
      return res.status(500).json({
        error: "Agent planning failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/verify-completion — Gemini Vision checks cleaner's completion photo
  // ---------------------------------------------------------------------------
  app.post("/api/verify-completion", async (req, res) => {
    try {
      const { completionPhoto, issueContext } = req.body as {
        completionPhoto?: string;
        issueContext?: { category?: string; summary?: string };
      };

      if (
        !completionPhoto ||
        typeof completionPhoto !== "string" ||
        completionPhoto.trim() === ""
      ) {
        return res
          .status(400)
          .json({ error: "completionPhoto (base64 data URL) is required" });
      }

      if (!completionPhoto.startsWith("data:image/")) {
        return res.status(400).json({
          error: "completionPhoto must be a valid image data URL",
        });
      }

      // Apply rate limiting
      const ip = getClientIp(req);
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          retryAfterSeconds: rl.retryAfterSeconds,
        });
      }

      const category = issueContext?.category
        ? String(issueContext.category).trim().slice(0, 100)
        : "civic issue";
      const summary = issueContext?.summary
        ? String(issueContext.summary).trim().slice(0, MAX_TEXT_LENGTH)
        : "a reported civic problem";

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn(
          "GEMINI_API_KEY missing — returning simulated completion verification.",
        );
        return res.json({
          isResolved: true,
          confidence: "medium",
          summary:
            "Simulated verification: The area appears to be addressed based on the submitted photo.",
          isSimulated: true,
        });
      }

      const parts = completionPhoto.split(";base64,");
      const mimeType =
        parts.length === 2 ? parts[0].replace("data:", "") : "image/jpeg";
      const base64Data = parts.length === 2 ? parts[1] : completionPhoto;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `A civic issue was reported as "${category}": "${summary}".
This image is a completion photo submitted by a cleaner/worker claiming the issue has been resolved.

Assess whether the image plausibly shows the issue is now resolved or cleaned up.
Consider: Is the area visible? Does it look clean / repaired / addressed?
Be somewhat lenient — the cleaner may not have captured a perfect before/after.

Return ONLY strict JSON:
{
  "isResolved": boolean,
  "confidence": "high" | "medium" | "low",
  "summary": "one sentence describing what you see and whether it looks resolved"
}`,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              isResolved: { type: "BOOLEAN" },
              confidence: {
                type: "STRING",
                enum: ["high", "medium", "low"],
              },
              summary: { type: "STRING" },
            },
            required: ["isResolved", "confidence", "summary"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty response from Gemini");

      const parsed = JSON.parse(responseText);
      return res.json({ ...parsed, isSimulated: false });
    } catch (error: unknown) {
      console.error("Error during completion verification:", error);
      return res.status(500).json({
        error: "Completion verification failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/maps-config
  // ---------------------------------------------------------------------------
  app.get("/api/maps-config", (_req, res) => {
    res.json({ hasKey: !!process.env.VITE_GOOGLE_MAPS_API_KEY });
  });

  // ---------------------------------------------------------------------------
  // Vite dev middleware (dev) or static dist (prod)
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
