interface ResourceTypeStats {
    count: number;
    totalDuration: number;
    totalTransferSize: number;
}

interface SlowestResourcePhases {
    dns?: number;
    ssl?: number;
    ttfb?: number;
    connect?: number;
    download?: number;
    redirect?: number;
    restricted?: boolean;
}

interface SlowestResource {
    url: string;
    type: string;
    start: number;
    cached: boolean;
    phases: SlowestResourcePhases;
    status: number;
    duration: number;
    protocol: string | null;
    decodedSize: number;
    transferSize: number;
}

interface HarData {
    type: string;
    byType: {
        css: ResourceTypeStats;
        img: ResourceTypeStats;
        link: ResourceTypeStats;
        fetch: ResourceTypeStats;
        beacon: ResourceTypeStats;
        iframe: ResourceTypeStats;
        script: ResourceTypeStats;
    };
    slowest: SlowestResource[];
    siteDomain: string;
    totalRequests: number;
    totalTransferSize: number;
}

export interface NetworkServerRecord {
    id: number;
    session_id: string;
    current_page: string;
    created_at: string;
    city: string;
    country: string;
    device_type: string;
    ttfb: number;
    cache_status: string;
    experience: string;
    backend_ms: number;
    transfer_size: number;
    decoded_size: number;
    lcp_rating: string;
    lcp_value: number;
    inp_rating: string | null;
    inp_value: number | null;
    har_data: HarData;
}