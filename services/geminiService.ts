import { GoogleGenAI, Type } from "@google/genai";
import { ScanResults } from '../types';
import { Language } from "../App";

const scanResultsSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.INTEGER,
      description: 'An overall security score from 0 to 100, where higher is better.',
    },
    summary: {
      type: Type.STRING,
      description: 'A brief one or two-sentence summary of the overall security posture.'
    },
    details: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'The name of the scan, e.g., "SSL/HTTPS Analysis".' },
          status: { type: Type.STRING, description: "The result status: 'PASS', 'FAIL', or 'WARN'." },
          summary: { type: Type.STRING, description: 'A brief summary of the findings for this specific scan.' },
          recommendation: { type: Type.STRING, description: 'A concrete recommendation for improvement. Should be an empty string if status is PASS.' },
        },
        required: ['title', 'status', 'summary', 'recommendation'],
      },
    },
  },
  required: ['overallScore', 'summary', 'details'],
};

interface GeminiTranslations {
  analysisNotGeneratedSummary: string;
  analysisNotGeneratedRecommendation: string;
}

export const runSecurityAudit = async (url: string, selectedScans: string[], translations: GeminiTranslations, language: Language): Promise<ScanResults> => {
  if (!process.env.API_KEY) {
    throw new Error("API key is not configured.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const scanList = selectedScans.join(', ');
  const languageName = language === 'ru' ? 'Russian' : 'Uzbek';

  const prompt = `
    You are CyberAudit, an advanced AI cybersecurity analyst. 
    A user has requested a security scan for the website: ${url}.
    
    Perform a simulated but realistic and plausible analysis for the following areas: ${scanList}.
    
    Provide a detailed report in JSON format. The report must strictly adhere to the provided schema.

    **IMPORTANT INSTRUCTIONS:**
    1. The 'status' field for each detail item MUST be one of the following exact strings: 'PASS', 'FAIL', or 'WARN'. Do NOT translate this field.
    2. All other string values in the JSON response (overall summary, and for each detail item: title, summary, recommendation) MUST be written in the ${languageName} language.
    
    The analysis should be critical and identify potential issues where appropriate, providing specific and actionable advice.
    The overallScore should reflect the weighted average of the individual scan results.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: scanResultsSchema,
      },
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);

    // Ensure all requested scan types are in the result, even if Gemini omits them
    const resultTitles = new Set(result.details.map((d: { title: string; }) => d.title.toLowerCase()));
    for (const scan of selectedScans) {
        if (!resultTitles.has(scan.toLowerCase())) {
            result.details.push({
                title: scan,
                status: 'WARN',
                summary: translations.analysisNotGeneratedSummary,
                recommendation: translations.analysisNotGeneratedRecommendation
            });
        }
    }

    return result as ScanResults;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Throw a generic error key, the component will translate it.
    throw new Error("errors.geminiFetchFailed");
  }
};