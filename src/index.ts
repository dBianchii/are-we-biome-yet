import { Command } from "commander";
import { analyzeProject } from "./commands/analyze.js";
import { logger } from "./utils/logger.js";

const main = async () => {
	const program = new Command()
		.name("are-we-biome-yet")
		.description("Compare your eslint config to existing Biome configs")
		.version("0.0.1")
		.argument("<path>", "Path to analyze")
		.option("--json", "Output as JSON")
		.action(analyzeProject);

	await program.parseAsync();
};

main().catch((err) => {
	logger.error("Something went wrong");
	if (err instanceof Error) {
		logger.error(err);
	} else {
		logger.error(
			"An unknown error has occurred. Please open an issue on github with the below:",
		);
		console.log(err);
	}
	process.exit(1);
});
