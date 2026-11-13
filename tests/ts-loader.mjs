import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const VIRTUAL_DIR = path.join(ROOT, "__test_virtual__");

const CANDIDATE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

function resolveFileCandidate(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  for (const ext of CANDIDATE_EXTS) {
    const withExt = basePath + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of CANDIDATE_EXTS) {
      const idx = path.join(basePath, `index${ext}`);
      if (fs.existsSync(idx) && fs.statSync(idx).isFile()) {
        return idx;
      }
    }
  }
  return null;
}

function virtualUrl(name) {
  return pathToFileURL(path.join(VIRTUAL_DIR, `${name}.mjs`)).href;
}

const INSET_HEADER_STUBS = new Map([
  ["../utils/supabase/AuthProvider", "ui-AuthProvider"],
  ["@/app/(dashboard)/dashboard/siteContext", "ui-siteContext"],
  ["../theme/ThemeToggle", "ui-ThemeToggle"],
  ["../ui/sidebar", "ui-sidebar"],
  ["../ui/separator", "ui-separator"],
  ["../theme", "ui-theme"],
  ["../utils", "ui-utils"],
  ["@/components/ui/dropdown-menu", "ui-dropdown-menu"],
  ["@/app/(dashboard)/dashboard/wordpress-plugin-analysis/companionPlugin", "ui-companionPlugin"],
]);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return { url: virtualUrl("next-server"), shortCircuit: true };
  }
  if (specifier === "next/headers") {
    return { url: virtualUrl("next-headers"), shortCircuit: true };
  }
  if (specifier === "next/navigation") {
    return { url: virtualUrl("next-navigation"), shortCircuit: true };
  }
  if (specifier === "next/link") {
    return { url: virtualUrl("next-link"), shortCircuit: true };
  }

  if (context.parentURL?.endsWith("/Inset-Header.tsx") && INSET_HEADER_STUBS.has(specifier)) {
    return { url: virtualUrl(INSET_HEADER_STUBS.get(specifier)), shortCircuit: true };
  }

  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const resolved = resolveFileCandidate(path.join(SRC_DIR, rel));
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  if (
    (specifier === "." ||
      specifier === ".." ||
      specifier.startsWith("./") ||
      specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file://")
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const resolved = resolveFileCandidate(path.resolve(parentDir, specifier));
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}

const VIRTUAL_SOURCES = {
  "next-server": `
    import { createRequire } from "node:module";
    const require = createRequire(import.meta.url);
    const nextServer = require("next/server");
    export const NextRequest = nextServer.NextRequest;
    export const NextResponse = nextServer.NextResponse;
    export function after(task) {
      const queue = globalThis.__TEST_AFTER_QUEUE__;
      if (Array.isArray(queue)) {
        const p = Promise.resolve().then(() => (typeof task === "function" ? task() : task));
        queue.push(p);
        return;
      }
      throw new Error("after() called without __TEST_AFTER_QUEUE__");
    }
  `,
  "next-headers": `
    export async function cookies() {
      const map = globalThis.__TEST_COOKIES__ ?? new Map();
      return {
        get(name) {
          return map.has(name) ? { name, value: map.get(name) } : undefined;
        },
        getAll() {
          return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
        },
        set(opts) {
          if (typeof opts === "string") return;
          map.set(opts.name, opts.value);
        },
        delete(opts) {
          map.delete(typeof opts === "string" ? opts : opts.name);
        },
      };
    }
    export async function headers() {
      return new Headers();
    }
  `,
  "next-navigation": `
    export function useRouter() { return { push: () => {}, replace: () => {} }; }
    export function usePathname() { return globalThis.__TEST_UI_MOCKS__?.pathname ?? "/dashboard"; }
    export function useSearchParams() {
      const q = globalThis.__TEST_UI_MOCKS__?.searchParams ?? "";
      return new URLSearchParams(q);
    }
  `,
  "ui-AuthProvider": `
    export function useSupabaseUser() { return globalThis.__TEST_UI_MOCKS__?.user ?? null; }
    export function useUserRole() { return globalThis.__TEST_UI_MOCKS__?.role ?? null; }
  `,
  "ui-siteContext": `
    export function useSiteContext() {
      return {
        selectedSite: globalThis.__TEST_UI_MOCKS__?.selectedSite ?? "",
        orders: globalThis.__TEST_UI_MOCKS__?.orders ?? [],
      };
    }
  `,
  "ui-ThemeToggle": `
    export function ThemeToggle() { return null; }
  `,
  "ui-sidebar": `
    export function SidebarTrigger() { return null; }
  `,
  "ui-separator": `
    export function Separator() { return null; }
  `,
  "ui-theme": `
    import React from "react";
    export function CustomTooltip({ trigger }) { return React.createElement(React.Fragment, null, trigger); }
  `,
  "ui-utils": `
    export async function cachedData() { return { response: [] }; }
    export function cleanExpiredCache() {}
  `,
  "next-link": `
    import React from "react";
    export default function Link({ children, ...props }) {
      return React.createElement("a", props, children);
    }
  `,
  "ui-dropdown-menu": `
    import React from "react";
    export function DropdownMenu({ children }) { return React.createElement(React.Fragment, null, children); }
    export function DropdownMenuTrigger({ children }) { return React.createElement(React.Fragment, null, children); }
    export function DropdownMenuContent({ children }) { return React.createElement(React.Fragment, null, children); }
    export function DropdownMenuItem({ children, onClick }) { return React.createElement("div", { onClick }, children); }
  `,
  "ui-companionPlugin": `
    export async function downloadPluginZip() {}
  `,
};

export async function load(url, context, nextLoad) {
  const virtualPrefixUrl = pathToFileURL(VIRTUAL_DIR).href + "/";
  if (url.startsWith(virtualPrefixUrl)) {
    const key = url.slice(virtualPrefixUrl.length).replace(/\.mjs$/, "");
    return {
      format: "module",
      source: VIRTUAL_SOURCES[key],
      shortCircuit: true,
    };
  }

  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(source, {
      fileName: filePath,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    });
    return {
      format: "module",
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
}
