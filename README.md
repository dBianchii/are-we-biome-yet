# Are We Biome Yet? 🌱

A CLI tool to analyze your project's ESLint rules and compare them with Biome's available rules. This tool helps you understand which ESLint rules are currently enabled in your project and can assist in migrating to Biome.

## Installation

### From npm (when published)

```bash
npm install -g are-we-biome-yet
```

### From source

```bash
git clone <repository-url>
cd are-we-biome-yet
bun install
bun run build
npm link
```

## Usage

### Analyze ESLint Rules

Analyze ESLint rules in the current directory:

```bash
are-we-biome-yet analyze
```

Analyze a specific project:

```bash
are-we-biome-yet analyze /path/to/project
```

Analyze with a specific file context:

```bash
are-we-biome-yet analyze --file src/components/Button.tsx
```

Get JSON output for programmatic use:

```bash
are-we-biome-yet analyze --json
```

### Command Options

- `path` - Path to analyze (defaults to current directory)
- `--file <file>` - Specific file to analyze config for (default: "src/index.ts")
- `--json` - Output results as JSON
- `--help` - Show help information

## How It Works

This tool replicates the functionality of the shell command:

```bash
npx eslint --print-config src/app/page.tsx | jq -r '.rules | to_entries[] | select(.value[0] > 0) | .key'
```

It:

1. Uses ESLint's `--print-config` to get the resolved configuration
2. Filters rules where the severity level is greater than 0 (enabled rules)
3. Extracts and sorts the rule names
4. Outputs the list of active ESLint rules

## Example Output

```bash
$ are-we-biome-yet analyze
Analyzing ESLint rules for: /path/to/project/src/index.ts
Found 68 enabled ESLint rules:
constructor-super
curly
eqeqeq
for-direction
getter-return
no-async-promise-executor
no-case-declarations
# ... more rules
```

JSON format:

```bash
$ are-we-biome-yet analyze --json
[
  "constructor-super",
  "curly",
  "eqeqeq",
  "for-direction",
  "getter-return",
  "no-async-promise-executor"
]
```

## Requirements

- Node.js 18+
- ESLint configuration in your project
- Project must have ESLint installed (globally or locally)

## Development

```bash
# Install dependencies
bun install

# Development mode with watch
bun run dev

# Build for production
bun run build

# Test the CLI
node dist/index.js analyze --help
```

## Roadmap

- [ ] Compare ESLint rules with Biome's available rules
- [ ] Generate migration reports
- [ ] Suggest Biome equivalents for ESLint rules
- [ ] Support for multiple configuration formats
- [ ] Integration with popular frameworks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
