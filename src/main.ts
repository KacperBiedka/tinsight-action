import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as fs from "fs";
import * as path from "path";

async function run(): Promise<void> {
  console.log("Running Tinsight Action...");
  try {
    const buildCommand = core.getInput("build-command") || "npm run build";
    const buildDir = core.getInput("build-dir") || "dist";

    core.info(`🔨 Running build command: ${buildCommand}`);

    // Build the app
    await exec.exec(buildCommand);

    core.info(`📁 Checking build directory: ${buildDir}`);

    // Check if build directory exists
    if (!fs.existsSync(buildDir)) {
      core.setFailed(`Build directory ${buildDir} does not exist`);
      return;
    }

    // Log build directory contents
    const buildContents = fs.readdirSync(buildDir);
    core.info(`📋 Build directory contents: ${buildContents.join(", ")}`);

    // Check for client.manifest.json
    const manifestPath = path.join(buildDir, "client.manifest.json");
    if (fs.existsSync(manifestPath)) {
      core.info(`✅ Found client.manifest.json`);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      core.info(`📊 Manifest keys: ${Object.keys(manifest).join(", ")}`);
      core.info(`📦 Total files in manifest: ${manifest.all?.length || 0}`);
      core.info(`⚡ Async chunks: ${manifest.async?.length || 0}`);
      core.info(`🔧 Initial chunks: ${manifest.initial?.length || 0}`);
      core.info(
        `🧩 Total modules: ${Object.keys(manifest.modules || {}).length}`
      );
    } else {
      core.warning(`❌ client.manifest.json not found in ${buildDir}`);
    }

    // Check for server/pages directory
    const serverPagesDir = path.join(buildDir, "server", "pages");
    if (fs.existsSync(serverPagesDir)) {
      core.info(`✅ Found server/pages directory`);

      const pageFiles = fs
        .readdirSync(serverPagesDir)
        .filter((file) => file.endsWith(".js"));

      core.info(`📄 Page files found: ${pageFiles.join(", ")}`);
      core.info(`📊 Total pages: ${pageFiles.length}`);

      // Log first few lines of each page file to see component IDs
      for (const file of pageFiles.slice(0, 3)) {
        // Only first 3 files
        const filePath = path.join(serverPagesDir, file);
        const content = fs.readFileSync(filePath, "utf8");
        const lines = content.split("\n").slice(0, 5).join("\\n");
        core.info(`📝 ${file} preview: ${lines}`);

        // Look for component ID pattern
        const componentIdMatch = content.match(
          /componentNormalizer.*?"([a-f0-9]{8})"/
        );
        if (componentIdMatch) {
          core.info(`🆔 ${file} component ID: ${componentIdMatch[1]}`);
        }
      }
    } else {
      core.warning(`❌ server/pages directory not found in ${buildDir}`);
    }

    // Log GitHub context info
    core.info(`🔄 GitHub SHA: ${process.env.GITHUB_SHA}`);
    core.info(`🌿 GitHub Ref: ${process.env.GITHUB_REF}`);
    core.info(`📁 GitHub Repository: ${process.env.GITHUB_REPOSITORY}`);

    core.info(`✅ Analysis complete!`);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : "Unknown error");
  }
}

run();
