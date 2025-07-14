import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface PageMetadata {
  hash: string;
  componentId?: string;
  route: string;
  size: number;
}

export interface BuildMetadata {
  framework: string;
  pages: Record<string, PageMetadata>;
  timestamp: number;
}

export async function extractBuildMetadata(
  buildDir: string
): Promise<BuildMetadata> {
  // Check if it's Nuxt 2
  const manifestPath = path.join(buildDir, "client.manifest.json");
  const serverPagesDir = path.join(buildDir, "server", "pages");

  if (!fs.existsSync(manifestPath) || !fs.existsSync(serverPagesDir)) {
    throw new Error("Not a Nuxt 2 build directory");
  }

  const pages: Record<string, PageMetadata> = {};

  // Read all page files
  const pageFiles = fs
    .readdirSync(serverPagesDir)
    .filter((file) => file.endsWith(".js"));

  for (const file of pageFiles) {
    const filePath = path.join(serverPagesDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    const hash = crypto.createHash("md5").update(content).digest("hex");
    const componentId = extractComponentId(content);
    const route = fileToRoute(file);

    pages[file] = {
      hash,
      componentId,
      route,
      size: content.length,
    };
  }

  return {
    framework: "nuxt2",
    pages,
    timestamp: Date.now(),
  };
}

function extractComponentId(content: string): string | undefined {
  // Look for: "1ce46445" in component normalizer
  const match = content.match(/componentNormalizer.*?"([a-f0-9]{8})"/);
  return match ? match[1] : undefined;
}

function fileToRoute(filename: string): string {
  // index.js -> /
  // about.js -> /about
  // blog/_slug.js -> /blog/:slug
  return filename === "index.js" ? "/" : `/${filename.replace(".js", "")}`;
}
