import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// NOTE: do not derive __dirname from import.meta.url here — the production
// bundle is CommonJS (esbuild --format=cjs), where import.meta.url is
// undefined and fileURLToPath() throws at startup. Production paths use
// process.cwd() below. Removed dead __dirname/__filename that crashed boot.

// ---------------------------------------------------------------------------
// Agentic Resolution Layer (/api/agent/resolve) — types + simulation helper.
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

// Maps each civic category to the realistic municipal authority responsible.
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

// Deterministic fallback so the agent works in demos without a configured key,
// mirroring the simulated-triage pattern.
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
  // Cloud Run injects the port via the PORT env var; honour it. Fall back to
  // 8080 (Cloud Run's default) for local/standalone runs. Hardcoding 3000 was
  // why the container failed the Cloud Run health check.
  const PORT = Number(process.env.PORT) || 8080;

  // Set limits higher to accept base64 photo uploads easily
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // API Endpoint: Triage reported issue photo using Gemini Multimodal Vision
  app.post("/api/triage", async (req, res) => {
    try {
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn(
          "GEMINI_API_KEY is missing or using placeholder. Returning high-quality simulated triage result.",
        );
        // High quality simulated response to ensure app works perfectly even without configured key
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
        const randomCategory =
          categories[Math.floor(Math.random() * categories.length)];
        const severities = ["Low", "Medium", "High"];
        const randomSeverity =
          severities[Math.floor(Math.random() * severities.length)];

        return res.json({
          category: randomCategory,
          severity: randomSeverity,
          summary: `Simulated: Civic issue identified in the submitted image (${randomCategory.toLowerCase()}).`,
          isSimulated: true,
        });
      }

      // Extract raw base64 data and mimeType
      let mimeType = "image/jpeg";
      let base64Data = image;

      if (image.startsWith("data:")) {
        const parts = image.split(";base64,");
        if (parts.length === 2) {
          mimeType = parts[0].replace("data:", "");
          base64Data = parts[1];
        }
      }

      console.log(
        "Sending request to Gemini Multimodal Vision API for triage...",
      );

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: `Analyze this image of a municipal, infrastructure, or civic issue in a neighborhood. 
You are a smart civic assistant triage model.
Return a structured JSON output with the following properties:
1. "category": Must be strictly one of: "Pothole", "Water Leak", "Streetlight", "Garbage/Waste", "Drainage", "Road Damage", "Public Safety", "Other".
2. "severity": Must be strictly one of: "Low", "Medium", "High".
3. "summary": A concise, clear, one-line summary describing the visible issue (maximum 12 words).

Analyze carefully. If the image is not a civic issue, place it in the most matching category or "Other", and write an objective summary.`,
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
              severity: {
                type: "STRING",
                enum: ["Low", "Medium", "High"],
              },
              summary: {
                type: "STRING",
              },
            },
            required: ["category", "severity", "summary"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini API");
      }

      const parsedData = JSON.parse(responseText);
      return res.json({
        category: parsedData.category,
        severity: parsedData.severity,
        summary: parsedData.summary,
        isSimulated: false,
      });
    } catch (error: any) {
      console.error("Error during Gemini triage:", error);
      return res.status(500).json({
        error: "Triage failed",
        details: error.message || error,
      });
    }
  });

  // API Endpoint: Agentic Resolution Layer. Given a reported issue + nearby
  // existing issues, Gemini autonomously routes it to the responsible authority,
  // flags likely duplicates, scores priority, drafts a formal complaint, and
  // recommends next actions. Degrades to a deterministic plan without a key.
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

      const nearby = Array.isArray(nearbyIssues)
        ? nearbyIssues.slice(0, 10)
        : [];
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn(
          "GEMINI_API_KEY missing or placeholder. Returning simulated agent plan.",
        );
        return res.json(buildSimulatedPlan(issue, nearby));
      }

      console.log("Running Gemini resolution agent...");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            text: `You are an autonomous civic resolution agent for a hyperlocal issue-reporting platform.
A citizen has reported an issue. Plan its resolution end to end.

REPORTED ISSUE (JSON):
${JSON.stringify(issue)}

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
8. "recommendedActions": an array of 2-3 short, concrete next steps.

Be realistic and specific to the issue's category, severity, and location.`,
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
      if (!responseText) {
        throw new Error("Empty response received from Gemini agent");
      }

      const parsed = JSON.parse(responseText);
      // Normalize the model's "none" sentinel into a real null for the client.
      const duplicateOfId =
        parsed.duplicateOfId && parsed.duplicateOfId !== "none"
          ? parsed.duplicateOfId
          : null;

      return res.json({ ...parsed, duplicateOfId, isSimulated: false });
    } catch (error: any) {
      console.error("Error during agent resolve:", error);
      return res.status(500).json({
        error: "Agent planning failed",
        details: error.message || error,
      });
    }
  });

  // Serve static Google Maps config check (safely returns whether VITE_GOOGLE_MAPS_API_KEY exists)
  app.get("/api/maps-config", (req, res) => {
    res.json({
      hasKey: !!process.env.VITE_GOOGLE_MAPS_API_KEY,
    });
  });

  // Vite development middleware setup or production static server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
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
