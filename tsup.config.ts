import { defineConfig } from "tsup";

const isDev = process.env.npm_lifecycle_event === "dev";

export default defineConfig({
	clean: true,
	entry: ["src/**/*.ts"],
	format: ["esm"],
	minify: !isDev,
	target: "node18",
	outDir: "dist",
	external: ["eslint", "os", "tty", "child_process", "fs", "path", "process"],
	platform: "node",
	bundle: false,
	banner: {
		js: "#!/usr/bin/env node",
	},
	onSuccess: isDev ? "node dist/index.js" : undefined,
});
