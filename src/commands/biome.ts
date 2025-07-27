import { logger } from "../utils/logger.js";

interface BiomeRuleMapping {
	eslintRule: string;
	biomeRule: string;
	source: string;
}

interface BiomeRulesData {
	mappings: BiomeRuleMapping[];
	exclusiveRules: string[];
	sources: string[];
}

const BIOME_SOURCES_URLS = [
	"https://raw.githubusercontent.com/biomejs/website/refs/heads/main/src/content/docs/linter/css/sources.mdx",
	"https://raw.githubusercontent.com/biomejs/website/refs/heads/main/src/content/docs/linter/javascript/sources.mdx",
	"https://raw.githubusercontent.com/biomejs/website/refs/heads/main/src/content/docs/linter/json/sources.mdx",
];

export const fetchBiomeRules = async (): Promise<BiomeRulesData> => {
	const allMappings: BiomeRuleMapping[] = [];
	const allExclusiveRules: string[] = [];
	const sources: string[] = [];

	try {
		for (const url of BIOME_SOURCES_URLS) {
			logger.info(`Fetching Biome rules from: ${url}`);

			const response = await fetch(url);
			if (!response.ok) {
				logger.error(`Failed to fetch ${url}: ${response.statusText}`);
				continue;
			}

			const content = await response.text();
			const parsedData = parseBiomeMarkdown(content, url);

			allMappings.push(...parsedData.mappings);
			allExclusiveRules.push(...parsedData.exclusiveRules);
			sources.push(url);
		}

		logger.info(`Found ${allMappings.length} ESLint → Biome rule mappings`);

		return {
			mappings: allMappings,
			exclusiveRules: allExclusiveRules,
			sources,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch Biome rules: ${error.message}`);
		}
		throw new Error("Failed to fetch Biome rules");
	}
};

function parseBiomeMarkdown(
	content: string,
	sourceUrl: string,
): BiomeRulesData {
	const mappings: BiomeRuleMapping[] = [];
	const exclusiveRules: string[] = [];

	const lines = content.split("\n");
	let currentSection = "";
	let inTable = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trim() || "";

		// Detect section headers
		if (line.startsWith("### ")) {
			currentSection = line.replace("### ", "").trim();
			inTable = false;
			continue;
		}

		// Detect Biome exclusive rules
		if (line.startsWith("## Biome exclusive rules")) {
			// Look for the list items after this header
			for (
				let j = i + 1;
				j < lines.length && !lines[j]?.startsWith("## ");
				j++
			) {
				const listItem = lines[j]?.trim() || "";
				if (listItem.startsWith("- [")) {
					const ruleMatch = listItem.match(/\[([^\]]+)\]/);
					if (ruleMatch?.[1]) {
						exclusiveRules.push(ruleMatch[1]);
					}
				}
			}
			continue;
		}

		// Detect table headers
		if (line.includes("| ---- | ---- |")) {
			inTable = true;
			continue;
		}

		// Parse table rows - more flexible matching
		if (
			inTable &&
			line.includes("|") &&
			line.includes("[") &&
			line.includes("](")
		) {
			const mapping = parseTableRow(line, currentSection);
			if (mapping) {
				mappings.push(mapping);
			}
		} else if (inTable && !line.includes("|") && line.length > 0) {
			inTable = false;
		}
	}

	return { mappings, exclusiveRules, sources: [sourceUrl] };
}

function parseTableRow(line: string, section: string): BiomeRuleMapping | null {
	// Parse table row like: | [eslint-rule](url) |[biome-rule](url) |
	// Split by | and filter out empty columns
	const columns = line
		.split("|")
		.map((col) => col.trim())
		.filter((col) => col.length > 0);

	if (columns.length < 2) return null;

	// Extract rule names from markdown links [rule-name](url)
	const eslintMatch = columns[0]?.match(/\[([^\]]+)\]/);
	const biomeMatch = columns[1]?.match(/\[([^\]]+)\]/);

	if (!eslintMatch?.[1] || !biomeMatch?.[1]) return null;

	const eslintRule = eslintMatch[1];
	const biomeRule = biomeMatch[1];

	// Skip if it's not a valid rule name
	if (
		!eslintRule ||
		!biomeRule ||
		eslintRule.includes("Rules name") ||
		biomeRule.includes("Rules name")
	) {
		return null;
	}

	// Clean source name
	const cleanSource = cleanSourceName(section);

	return {
		eslintRule,
		biomeRule,
		source: cleanSource,
	};
}

function cleanSourceName(section: string): string {
	// Clean up section names
	return (
		section
			.replace(/Rules name.*$/i, "")
			.replace(/\|/g, "")
			.trim() || "ESLint"
	);
}

export const findBiomeEquivalent = (
	eslintRule: string,
	biomeData: BiomeRulesData,
): string | null => {
	// First try to find exact match
	let mapping = biomeData.mappings.find((m) => m.eslintRule === eslintRule);
	if (mapping) {
		return mapping.biomeRule;
	}

	// If no exact match, try without plugin prefixes
	const ruleWithoutPrefix = stripPluginPrefix(eslintRule);
	if (ruleWithoutPrefix !== eslintRule) {
		mapping = biomeData.mappings.find(
			(m) => m.eslintRule === ruleWithoutPrefix,
		);
		if (mapping) {
			return mapping.biomeRule;
		}
	}

	return null;
};

function stripPluginPrefix(ruleName: string): string {
	const prefixes = [
		"@typescript-eslint/",
		"@next/next/",
		"@tanstack/query/",
		"react/",
		"react-hooks/",
		"import/",
		"jsx-a11y/",
		"drizzle/",
		"turbo/",
		"prettier/",
		"simple-import-sort/",
		"prefer-function-component/",
	];

	for (const prefix of prefixes) {
		if (ruleName.startsWith(prefix)) {
			return ruleName.substring(prefix.length);
		}
	}

	return ruleName;
}

export const analyzeBiomeCompatibility = (
	eslintRules: string[],
	biomeData: BiomeRulesData,
) => {
	const compatible: Array<{
		eslint: string;
		biome: string;
		source: string;
	}> = [];
	const incompatible: string[] = [];

	for (const eslintRule of eslintRules) {
		const biomeEquivalent = findBiomeEquivalent(eslintRule, biomeData);
		if (biomeEquivalent) {
			// Find the mapping to get the source
			const mapping = biomeData.mappings.find(
				(m) =>
					m.eslintRule === eslintRule ||
					m.eslintRule === stripPluginPrefix(eslintRule),
			);

			compatible.push({
				eslint: eslintRule,
				biome: biomeEquivalent,
				source: mapping?.source || "Unknown",
			});
		} else {
			incompatible.push(eslintRule);
		}
	}

	return {
		compatible,
		incompatible,
		compatibilityRate:
			eslintRules.length > 0
				? (compatible.length / eslintRules.length) * 100
				: 0,
	};
};
