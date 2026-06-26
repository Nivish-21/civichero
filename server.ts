import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// NOTE: do not derive __dirname from import.meta.url here — the production
// bundle is CommonJS (esbuild --format=cjs), where import.meta.url is
// undefined and fileURLToPath() throws at startup. Production paths use
// process.cwd() below. Removed dead __dirname/__filename that crashed boot.

async function startServer() {
  const app = express();
  // Cloud Run injects the port via the PORT env var; honour it. Fall back to
  // 8080 (Cloud Run's default) for local/standalone runs. Hardcoding 3000 was
  // why the container failed the Cloud Run health check.
  const PORT = Number(process.env.PORT) || 8080;

  // Set limits higher to accept base64 photo uploads easily
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API Endpoint: Triage reported issue photo using Gemini Multimodal Vision
  app.post('/api/triage', async (req, res) => {
    try {
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
        console.warn('GEMINI_API_KEY is missing or using placeholder. Returning high-quality simulated triage result.');
        // High quality simulated response to ensure app works perfectly even without configured key
        const categories = ['Pothole', 'Water Leak', 'Streetlight', 'Garbage/Waste', 'Drainage', 'Road Damage', 'Public Safety', 'Other'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const severities = ['Low', 'Medium', 'High'];
        const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
        
        return res.json({
          category: randomCategory,
          severity: randomSeverity,
          summary: `Simulated: Civic issue identified in the submitted image (${randomCategory.toLowerCase()}).`,
          isSimulated: true
        });
      }

      // Extract raw base64 data and mimeType
      let mimeType = 'image/jpeg';
      let base64Data = image;

      if (image.startsWith('data:')) {
        const parts = image.split(';base64,');
        if (parts.length === 2) {
          mimeType = parts[0].replace('data:', '');
          base64Data = parts[1];
        }
      }

      console.log('Sending request to Gemini Multimodal Vision API for triage...');
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `Analyze this image of a municipal, infrastructure, or civic issue in a neighborhood. 
You are a smart civic assistant triage model.
Return a structured JSON output with the following properties:
1. "category": Must be strictly one of: "Pothole", "Water Leak", "Streetlight", "Garbage/Waste", "Drainage", "Road Damage", "Public Safety", "Other".
2. "severity": Must be strictly one of: "Low", "Medium", "High".
3. "summary": A concise, clear, one-line summary describing the visible issue (maximum 12 words).

Analyze carefully. If the image is not a civic issue, place it in the most matching category or "Other", and write an objective summary.`
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              category: {
                type: 'STRING',
                enum: ['Pothole', 'Water Leak', 'Streetlight', 'Garbage/Waste', 'Drainage', 'Road Damage', 'Public Safety', 'Other']
              },
              severity: {
                type: 'STRING',
                enum: ['Low', 'Medium', 'High']
              },
              summary: {
                type: 'STRING'
              }
            },
            required: ['category', 'severity', 'summary']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response received from Gemini API');
      }

      const parsedData = JSON.parse(responseText);
      return res.json({
        category: parsedData.category,
        severity: parsedData.severity,
        summary: parsedData.summary,
        isSimulated: false
      });

    } catch (error: any) {
      console.error('Error during Gemini triage:', error);
      return res.status(500).json({ 
        error: 'Triage failed', 
        details: error.message || error 
      });
    }
  });

  // Serve static Google Maps config check (safely returns whether VITE_GOOGLE_MAPS_API_KEY exists)
  app.get('/api/maps-config', (req, res) => {
    res.json({
      hasKey: !!process.env.VITE_GOOGLE_MAPS_API_KEY,
    });
  });

  // Vite development middleware setup or production static server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
