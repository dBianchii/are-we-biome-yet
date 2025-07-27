import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { analyzeBiomeCompatibility, fetchBiomeRules } from "./biome.js";

interface ESLintRule {
	[key: string]: unknown[];
}

interface ESLintConfig {
	rules: ESLintRule;
}

export interface AnalyzeOptions {
	json?: boolean;
}

export const analyzeProject = async (
	filePath: string,
	options: AnalyzeOptions,
) => {
	try {
		const absolutePath = path.resolve(filePath);

		if (!existsSync(absolutePath)) {
			logger.error(`File does not exist: ${absolutePath}`);
			process.exit(1);
		}

		logger.info(`Analyzing ESLint rules for: ${absolutePath}`);

		// Get ESLint config for the specific file
		const eslintConfig = await getESLintConfig(absolutePath);

		// Extract enabled rules
		const enabledRules = extractEnabledRules(eslintConfig);

		// Always fetch Biome rules
		logger.info("Fetching Biome rule mappings...");
		const biomeData = await fetchBiomeRules();

		// Output results
		if (options.json) {
			const compatibility = analyzeBiomeCompatibility(enabledRules, biomeData);

			const result = {
				eslintRules: enabledRules,
				totalRules: enabledRules.length,
				biomeCompatibility: compatibility,
			};

			console.log(JSON.stringify(result, null, 2));
		} else {
			logger.info(`Found ${enabledRules.length} enabled ESLint rules:`);
			enabledRules.forEach((rule) => console.log(rule));

			console.log(`\n${"=".repeat(50)}`);
			console.log("BIOME COMPATIBILITY ANALYSIS");
			console.log("=".repeat(50));

			const compatibility = analyzeBiomeCompatibility(enabledRules, biomeData);

			console.log(
				`\nCompatibility Rate: ${compatibility.compatibilityRate.toFixed(1)}%`,
			);
			console.log(
				`Compatible Rules: ${compatibility.compatible.length}/${enabledRules.length}`,
			);

			if (compatibility.compatible.length > 0) {
				console.log("\n✅ COMPATIBLE RULES:");
				compatibility.compatible.forEach(({ eslint, biome }) => {
					console.log(`  ${eslint} → ${biome}`);
				});
			}

			if (compatibility.incompatible.length > 0) {
				console.log("\n❌ INCOMPATIBLE RULES:");
				compatibility.incompatible.forEach((rule) => {
					console.log(`  ${rule} (no Biome equivalent)`);
				});
			}

			console.log(`\n📊 SUMMARY:`);
			console.log(
				`  • ${compatibility.compatible.length} rules have Biome equivalents`,
			);
			console.log(
				`  • ${compatibility.incompatible.length} rules need alternative solutions`,
			);
			console.log(
				`  • ${biomeData.exclusiveRules.length} Biome-exclusive rules available`,
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			logger.error(`Failed to analyze project: ${error.message}`);
		} else {
			logger.error("An unknown error occurred during analysis");
		}
		process.exit(1);
	}
};

async function getESLintConfig(filePath: string): Promise<ESLintConfig> {
	try {
		const targetDir = path.dirname(filePath);

		// First try with flat config support (ESLint v9+)
		let eslintCommand = `npx eslint --print-config "${filePath}"`;
		let output: string;

		try {
			output = execSync(eslintCommand, {
				encoding: "utf8",
				cwd: targetDir,
			});
		} catch (_flatConfigError) {
			// If flat config fails, try with legacy config support
			logger.info(
				"Flat config failed, trying with legacy .eslintrc support...",
			);
			eslintCommand = `ESLINT_USE_FLAT_CONFIG=false npx eslint --print-config "${filePath}"`;
			try {
				output = execSync(eslintCommand, {
					encoding: "utf8",
					cwd: targetDir,
					env: { ...process.env, ESLINT_USE_FLAT_CONFIG: "false" },
				});
			} catch (_legacyError) {
				// If both fail, try to find config in parent directories
				logger.info(
					"Legacy config also failed, searching for ESLint config in parent directories...",
				);
				const foundConfig = await findESLintConfigInParents(targetDir);
				if (foundConfig) {
					output = execSync(eslintCommand, {
						encoding: "utf8",
						cwd: foundConfig,
						env: { ...process.env, ESLINT_USE_FLAT_CONFIG: "false" },
					});
				} else {
					throw new Error(
						`No ESLint configuration found. Please ensure you have either:\n` +
							`  • eslint.config.js (ESLint v9+ flat config)\n` +
							`  • .eslintrc.json, .eslintrc.js, or .eslintrc.yml (legacy config)\n` +
							`\nYou can create a basic config with: npm init @eslint/config`,
					);
				}
			}
		}

		return JSON.parse(output) as ESLintConfig;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to get ESLint config: ${error.message}`);
		}
		throw new Error("Failed to get ESLint config");
	}
}

async function findESLintConfigInParents(
	startDir: string,
): Promise<string | null> {
	const { dirname: pathDirname } = await import("node:path");
	const { existsSync } = await import("node:fs");

	const configFiles = [
		"eslint.config.js",
		"eslint.config.mjs",
		"eslint.config.cjs",
		".eslintrc.json",
		".eslintrc.js",
		".eslintrc.yml",
		".eslintrc.yaml",
		".eslintrc",
	];

	let currentDir = startDir;
	const root = pathDirname(currentDir);

	while (currentDir !== root) {
		for (const configFile of configFiles) {
			const configPath = `${currentDir}/${configFile}`;
			if (existsSync(configPath)) {
				return currentDir;
			}
		}
		currentDir = pathDirname(currentDir);
	}

	return null;
}

function extractEnabledRules(config: ESLintConfig): string[] {
	if (!config.rules) {
		return [];
	}

	return Object.entries(config.rules)
		.filter(([_, value]) => {
			// ESLint rules can be:
			// - "off" or 0 (disabled)
			// - "warn" or 1 (warning)
			// - "error" or 2 (error)
			// - Array with severity as first element
			if (Array.isArray(value)) {
				const severity = value[0];
				return typeof severity === "number" ? severity > 0 : severity !== "off";
			}
			return typeof value === "number" ? value > 0 : value !== "off";
		})
		.map(([ruleName]) => ruleName)
		.sort();
}
