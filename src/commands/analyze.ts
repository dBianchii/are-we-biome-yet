import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "../utils/logger.js";

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
		const absolutePath = resolve(filePath);

		if (!existsSync(absolutePath)) {
			logger.error(`File does not exist: ${absolutePath}`);
			process.exit(1);
		}

		logger.info(`Analyzing ESLint rules for: ${absolutePath}`);

		const eslintConfig = await getESLintConfig(absolutePath);

		// Extract enabled rules
		const enabledRules = extractEnabledRules(eslintConfig);

		// Output results
		if (options.json) {
			console.log(JSON.stringify(enabledRules, null, 2));
		} else {
			logger.info(`Found ${enabledRules.length} enabled ESLint rules:`);
			enabledRules.forEach((rule) => console.log(rule));
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
		// Check if ESLint is available
		const eslintCommand = `npx eslint --print-config "${filePath}"`;
		const output = execSync(eslintCommand, {
			encoding: "utf8",
			cwd: process.cwd(),
		});

		return JSON.parse(output) as ESLintConfig;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to get ESLint config: ${error.message}`);
		}
		throw new Error("Failed to get ESLint config");
	}
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
