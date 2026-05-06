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
  const backendUrl = import.meta.env.VITE_API_BASE_URL;

  if (!backendUrl) {
    throw new Error("Backend URL (VITE_API_BASE_URL) is not configured.");
  }

  try {
    const response = await fetch(`${backendUrl}/scan?domain=${encodeURIComponent(url)}&lang=${language}`, {
      method: 'GET',
      headers: {
          'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status} - ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    
    // Transform Python backend format to our frontend format
    const details = [];
    const res = data.results || {};
    
    if (selectedScans.includes("SSL/HTTPS Analysis") || selectedScans.includes("Анализ SSL/HTTPS") || selectedScans.includes("SSL/HTTPS tahlili")) {
        details.push({
            title: "SSL/HTTPS Analysis",
            status: res.ssl?.valid ? 'PASS' : 'FAIL',
            summary: res.ssl?.valid ? `Valid certificate issued by ${res.ssl.issuer}` : `SSL issues detected: ${res.ssl?.error || 'Unknown'}`,
            recommendation: res.ssl?.valid ? "" : "Renew or install a trusted SSL certificate."
        });
    }
    
    if (selectedScans.includes("Open Ports") || selectedScans.includes("Открытые порты") || selectedScans.includes("Ochiq portlar")) {
        const openPorts = res.ports?.open || [];
        const status = openPorts.length > 2 ? 'WARN' : 'PASS'; // basic logic
        details.push({
            title: "Open Ports",
            status: status,
            summary: `Found ${openPorts.length} open ports: ${openPorts.join(', ')}`,
            recommendation: status === 'WARN' ? "Close unnecessary open ports." : ""
        });
    }

    if (selectedScans.includes("Security Headers") || selectedScans.includes("Заголовки безопасности") || selectedScans.includes("Xavfsizlik sarlavhalari")) {
        const missing = res.headers?.missing || [];
        details.push({
            title: "Security Headers",
            status: missing.length > 0 ? 'WARN' : 'PASS',
            summary: missing.length > 0 ? `Missing security headers: ${missing.join(', ')}` : "All standard security headers are present.",
            recommendation: missing.length > 0 ? "Implement missing HTTP security headers." : ""
        });
    }
    
    const overallScore = typeof data.score === 'number' ? data.score : 0;
    
    return {
        overallScore: overallScore,
        summary: data.ai_summary || "Real scan completed successfully.",
        details: details
    } as ScanResults;

  } catch (error) {
    console.error("Error calling real backend API:", error);
    throw new Error("errors.geminiFetchFailed"); // Keeping the same error key for frontend translations, but it means backend failed now. Or maybe we should improve it.
  }
};