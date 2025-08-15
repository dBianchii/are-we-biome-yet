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

// New interface for the Biome rules JSON structure
interface BiomeRulesJson {
	lints: {
		languages: {
			[key: string]: {
				[key: string]: {
					[key: string]: {
						name: string;
						link: string;
						recommended?: boolean;
						deprecated?: boolean;
						sources?: Array<{
							kind: string;
							source: {
								[key: string]: string;
							};
						}>;
					};
				};
			};
		};
	};
}

const BIOME_RULES_URL = "https://biomejs.dev/metadata/rules.json";

export const fetchBiomeRules = async (): Promise<BiomeRulesData> => {
	const allMappings: BiomeRuleMapping[] = [];
	const allExclusiveRules: string[] = [];
	const sources: string[] = [];

	try {
		logger.info(`Fetching Biome rules from: ${BIOME_RULES_URL}`);

		const response = await fetch(BIOME_RULES_URL);
		if (!response.ok) {
			throw new Error(`Failed to fetch Biome rules: ${response.statusText}`);
		}

		const biomeRulesData = await response.json() as BiomeRulesJson;
		
		// Process the JSON structure to extract rule mappings
		const { mappings, exclusiveRules } = parseBiomeRulesJson(biomeRulesData);
		
		allMappings.push(...mappings);
		allExclusiveRules.push(...exclusiveRules);
		sources.push(BIOME_RULES_URL);

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

function parseBiomeRulesJson(biomeRulesData: BiomeRulesJson): BiomeRulesData {
	const mappings: BiomeRuleMapping[] = [];
	const exclusiveRules: string[] = [];

	// Process each language
	for (const [language, languageRules] of Object.entries(biomeRulesData.lints.languages)) {
		// Process each category within the language
		for (const [category, categoryRules] of Object.entries(languageRules)) {
			// Process each rule within the category
			for (const [ruleName, ruleData] of Object.entries(categoryRules)) {
				// Check if this rule has sources (indicating it's a mapping from another tool)
				if (ruleData.sources && ruleData.sources.length > 0) {
					for (const source of ruleData.sources) {
						// Look for ESLint sources
						if (source.source.eslint) {
							mappings.push({
								eslintRule: source.source.eslint,
								biomeRule: ruleData.name,
								source: `${language}/${category}`,
							});
						}
					}
				} else {
					// This is a Biome-exclusive rule
					exclusiveRules.push(ruleData.name);
				}
			}
		}
	}

	return { mappings, exclusiveRules, sources: [BIOME_RULES_URL] };
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
