import * as core from "@actions/core";
import { BuildMetadata, PageMetadata } from "./extractor";

export interface ChangeResult {
  changedPages: string[];
  newPages: string[];
  deletedPages: string[];
  affectedRoutes: string[];
  hasGlobalChanges: boolean;
  summary: string;
}

export async function compareBuilds(
  baseline: BuildMetadata | null,
  current: BuildMetadata
): Promise<ChangeResult> {
  // If no baseline, everything is "new"
  if (!baseline) {
    const allPages = Object.keys(current.pages);
    const allRoutes = allPages.map((page) => current.pages[page].route);

    return {
      changedPages: [],
      newPages: allPages,
      deletedPages: [],
      affectedRoutes: allRoutes,
      hasGlobalChanges: true,
      summary: `No baseline found. Will test all ${allPages.length} pages.`,
    };
  }

  const result: ChangeResult = {
    changedPages: [],
    newPages: [],
    deletedPages: [],
    affectedRoutes: [],
    hasGlobalChanges: false,
    summary: "",
  };

  const baselinePages = new Set(Object.keys(baseline.pages));
  const currentPages = new Set(Object.keys(current.pages));

  // Find changed pages (same file, different hash)
  for (const pageName of currentPages) {
    if (baselinePages.has(pageName)) {
      const baselineHash = baseline.pages[pageName].hash;
      const currentHash = current.pages[pageName].hash;

      if (baselineHash !== currentHash) {
        result.changedPages.push(pageName);
        result.affectedRoutes.push(current.pages[pageName].route);

        // Log detailed change info
        const baselineSize = baseline.pages[pageName].size;
        const currentSize = current.pages[pageName].size;
        const sizeDiff = currentSize - baselineSize;

        core.info(
          `📝 ${pageName} changed (${sizeDiff > 0 ? "+" : ""}${sizeDiff} bytes)`
        );
      }
    }
  }

  // Find new pages
  for (const pageName of currentPages) {
    if (!baselinePages.has(pageName)) {
      result.newPages.push(pageName);
      result.affectedRoutes.push(current.pages[pageName].route);
      core.info(`✨ ${pageName} is new`);
    }
  }

  // Find deleted pages
  for (const pageName of baselinePages) {
    if (!currentPages.has(pageName)) {
      result.deletedPages.push(pageName);
      core.info(`🗑️  ${pageName} was deleted`);
    }
  }

  // Check for potential global changes
  result.hasGlobalChanges = detectGlobalChanges(result);

  // Generate summary
  result.summary = generateSummary(result);

  return result;
}

function detectGlobalChanges(result: ChangeResult): boolean {
  const totalChanges = result.changedPages.length + result.newPages.length;
  const threshold = 5; // If >5 pages changed, probably global change

  if (totalChanges > threshold) {
    core.warning(
      `⚠️  ${totalChanges} pages changed - possible global change detected`
    );
    return true;
  }

  return false;
}

function generateSummary(result: ChangeResult): string {
  const parts: string[] = [];

  if (result.changedPages.length > 0) {
    parts.push(`${result.changedPages.length} changed`);
  }

  if (result.newPages.length > 0) {
    parts.push(`${result.newPages.length} new`);
  }

  if (result.deletedPages.length > 0) {
    parts.push(`${result.deletedPages.length} deleted`);
  }

  if (parts.length === 0) {
    return "🎉 No changes detected - skipping visual regression tests";
  }

  const changeText = parts.join(", ");
  const routeCount = result.affectedRoutes.length;

  if (result.hasGlobalChanges) {
    return `🔍 Detected ${changeText} pages. Global changes suspected - will test all routes for safety.`;
  }

  return `🔍 Detected ${changeText} pages. Will test ${routeCount} affected route${
    routeCount === 1 ? "" : "s"
  }: ${result.affectedRoutes.join(", ")}`;
}

// Advanced comparison helpers

export function compareComponentIds(
  baseline: BuildMetadata,
  current: BuildMetadata
): string[] {
  const changedComponents: string[] = [];

  for (const [pageName, pageData] of Object.entries(current.pages)) {
    const baselinePage = baseline.pages[pageName];

    if (
      baselinePage &&
      pageData.componentId &&
      baselinePage.componentId &&
      pageData.componentId !== baselinePage.componentId
    ) {
      changedComponents.push(pageName);
      core.info(
        `🔄 ${pageName}: component ID changed ${baselinePage.componentId} → ${pageData.componentId}`
      );
    }
  }

  return changedComponents;
}

export function analyzeChangeImpact(
  result: ChangeResult
): "low" | "medium" | "high" {
  const totalAffected = result.affectedRoutes.length;

  if (result.hasGlobalChanges || totalAffected > 10) {
    return "high";
  } else if (totalAffected > 3) {
    return "medium";
  } else {
    return "low";
  }
}

// For future use - detect specific types of changes
export function detectChangeTypes(result: ChangeResult): {
  hasLayoutChanges: boolean;
  hasContentChanges: boolean;
  hasStyleChanges: boolean;
} {
  // Placeholder for future sophisticated analysis
  // Could analyze file size changes, component ID patterns, etc.

  return {
    hasLayoutChanges: result.changedPages.length > 0,
    hasContentChanges: result.changedPages.length > 0,
    hasStyleChanges: result.hasGlobalChanges,
  };
}
