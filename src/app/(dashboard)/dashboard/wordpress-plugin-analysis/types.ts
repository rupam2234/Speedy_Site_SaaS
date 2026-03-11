export interface WPplugins {
    name: string;
    version: string;
    description: string;
    status: string;
    author: string;
    plugin_url?: string;
}

export interface PluginAnalysis {
    name: string;
    impactScore: number;
    impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    reasoning: string;
    recommendation: string;
    metrics: {
      estQueries: string;
      estHttpRequests: string;
      estLoadTime: string;
    };
    conflicts?: {
      plugin: string;
      issue: string;
    }[];
    isExternal?: boolean;
}