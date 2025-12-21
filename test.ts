import { chromium } from "playwright";

type NetworkConfig = {
  offline?: boolean; // default false
  latency?: number; // ms
  downloadThroughput?: number; // bytes/sec
  uploadThroughput?: number; // bytes/sec
};

type FileImpact = {
  url: string;
  file: string;
  networkKB: number;
  uncompressedKB: number;
  downloadSec: number;
  compressionRatio: number;
};

type PluginReport = {
  totalNetworkKB: number;
  totalUncompressedKB: number;
  requests: number;
  files: FileImpact[];
};

// Map plugin name -> PluginReport
type PluginReportMap = Record<string, PluginReport>;

type Job = {
  pageUrl: string;
  networkConfig?: NetworkConfig;
  resolve: (value: PluginReportMap | PromiseLike<PluginReportMap>) => void;
  reject: (reason?: any) => void;
};

class PluginAnalyzerQueue {
  private queue: Job[] = [];
  private runningJob: Job | null = null;
  private browser: any = null; // no need to import Browser type

  async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch();
    }
  }

  addJob(
    pageUrl: string,
    networkConfig?: NetworkConfig,
  ): Promise<PluginReportMap> {
    return new Promise((resolve, reject) => {
      this.queue.push({ pageUrl, networkConfig, resolve, reject });
      this.runNext();
    });
  }

  getStatus() {
    return {
      running: this.runningJob?.pageUrl ?? null,
      waiting: this.queue.map((job) => job.pageUrl),
    };
  }

  private async runNext() {
    if (this.runningJob || this.queue.length === 0) return;

    const job = this.queue.shift()!;
    this.runningJob = job;

    try {
      await this.initBrowser();
      const result = await this.runJob(job.pageUrl, job.networkConfig);
      job.resolve(result);
    } catch (err) {
      job.reject(err);
    } finally {
      this.runningJob = null;
      this.runNext();
    }
  }

  private async runJob(
    pageUrl: string,
    networkConfig?: NetworkConfig,
  ): Promise<PluginReportMap> {
    if (!this.browser) throw new Error("Browser not initialized");
    const context = await this.browser.newContext();
    const page = await context.newPage();

    // Network throttling
    if (networkConfig) {
      const client = await context.newCDPSession(page);
      await client.send("Network.enable");
      await client.send("Network.emulateNetworkConditions", {
        offline: networkConfig.offline ?? false,
        latency: networkConfig.latency ?? 0,
        downloadThroughput: networkConfig.downloadThroughput ?? -1,
        uploadThroughput: networkConfig.uploadThroughput ?? -1,
      });
    }

    const domain = new URL(pageUrl).hostname;
    const pluginReports: PluginReportMap = {};
    const requestStartTimes = new Map<string, number>();

    function getPluginName(url: string): string | null {
      const match = url.match(/wp-content\/plugins\/([^/]+)/);
      return match ? match[1] : null;
    }

    page.on("request", (request: { url: () => string }) => {
      requestStartTimes.set(request.url(), Date.now());
    });

    page.on(
      "response",
      async (response: { request: () => any; body: () => any }) => {
        const request = response.request();
        const url = request.url();
        if (!url.includes(domain)) return;

        const plugin = getPluginName(url);
        if (!plugin) return;

        const start = requestStartTimes.get(url);
        const downloadSec = start
          ? Number(((Date.now() - start) / 1000).toFixed(2))
          : 0;

        const sizes = await request.sizes();
        const networkKB =
          (sizes.requestBodySize +
            sizes.requestHeadersSize +
            sizes.responseBodySize +
            sizes.responseHeadersSize) /
          1024;

        let uncompressedKB = 0;
        try {
          const buffer = await response.body();
          uncompressedKB = buffer.length / 1024;
        } catch {}

        const file = url.split("/").pop() ?? url;
        const compressionRatio =
          uncompressedKB > 0
            ? Number((networkKB / uncompressedKB).toFixed(2))
            : 0;

        const entry: FileImpact = {
          url,
          file,
          networkKB: Number(networkKB.toFixed(2)),
          uncompressedKB: Number(uncompressedKB.toFixed(2)),
          downloadSec,
          compressionRatio,
        };

        if (!pluginReports[plugin]) {
          pluginReports[plugin] = {
            totalNetworkKB: 0,
            totalUncompressedKB: 0,
            requests: 0,
            files: [],
          };
        }

        pluginReports[plugin].totalNetworkKB += networkKB;
        pluginReports[plugin].totalUncompressedKB += uncompressedKB;
        pluginReports[plugin].requests += 1;
        pluginReports[plugin].files.push(entry);
      },
    );

    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await context.close();

    return pluginReports;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// --- Usage example ---
async function main() {
  const queue = new PluginAnalyzerQueue();

  queue
    .addJob("https://verminator.sg/", {
      latency: 150,
      downloadThroughput: (1600 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    })
    .then((report) => {
      console.log("Job 1 done:\n", JSON.stringify(report, null, 2));
    });

  const interval = setInterval(() => {
    console.log("Queue status:", queue.getStatus());
    if (!queue.getStatus().running && queue.getStatus().waiting.length === 0) {
      clearInterval(interval);
      queue.closeBrowser();
    }
  }, 1000);
}

main();
