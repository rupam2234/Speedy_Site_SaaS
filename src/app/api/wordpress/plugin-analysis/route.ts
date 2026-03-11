import { PluginAnalysis, WPplugins } from "@/app/(dashboard)/dashboard/wordpress-plugin-analysis/types";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";


interface Props {
    domain: string;
    key: string;
}

export async function POST(req: NextRequest){
    const {domain, key}: Props = await req.json();

    if(!domain || !key){
        return NextResponse.json({message: "Bad request"}, {status: 400});
    }

    try{
        const response = await fetch(`https://${domain}/wp-json/speedy-site/v1/plugins?key=${key}`, {
            method: "GET"
        });

        const data:any = await response.json();

        if(!response.ok){
            throw new Error("Unable to get data")
        }

        const pluginList = (data?.plugins ?? []).map((p: WPplugins) => ({
            name: p.name,
            version: p.version,
            description: p.description || '',
            status: 'active',
            author: '',
            plugin_url: ''
        }));

        if(pluginList.length === 0){
            return NextResponse.json({message: "No plugins found", data: []}, {status: 200})
        }

        // else we run the analysis
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const aiResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analyze these WordPress plugins for performance impact. Rank them by their potential to slow down a site. 
            Consider database queries, frontend asset loading, and background tasks.
            
            Plugins: ${JSON.stringify(pluginList.map((p: { name: string; description: string; }) => ({ name: p.name, description: p.description })))}
            
            For each plugin, provide:
            1. Estimated database queries per page load.
            2. Estimated external HTTP requests.
            3. Estimated execution time impact.
            4. Detect potential conflicts between these plugins (e.g., multiple caching plugins, multiple builders).`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    impactScore: { type: Type.NUMBER, description: "1-10, 10 being worst" },
                    impactLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
                    reasoning: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                    metrics: {
                      type: Type.OBJECT,
                      properties: {
                        estQueries: { type: Type.STRING },
                        estHttpRequests: { type: Type.STRING },
                        estLoadTime: { type: Type.STRING }
                      },
                      required: ["estQueries", "estHttpRequests", "estLoadTime"]
                    },
                    conflicts: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          plugin: { type: Type.STRING },
                          issue: { type: Type.STRING }
                        },
                        required: ["plugin", "issue"]
                      }
                    }
                  },
                  required: ["name", "impactScore", "impactLevel", "reasoning", "recommendation", "metrics"]
                }
              }
            }
        });

        const result: PluginAnalysis[] = JSON.parse(aiResponse.text || '[]');

        if(!result){
            throw new Error("AI didn't responded");
        }
        
        result.sort((a: any, b: any) => b.impactScore - a.impactScore).map((a: any) => ({ ...a, isExternal: true }));

        return NextResponse.json({result}, {status: 200})

    }catch(error: any){
        return NextResponse.json({message: error.message ?? "Unexpacted Error"}, {status: 500})
    }
}