# Are We Biome Yet?

A CLI tool to analyze your ESLint configuration and determine compatibility with [Biome](https://biomejs.dev/), the fast formatter and linter written in Rust.

## What it does

This tool helps you migrate from ESLint to Biome by:

1. **Analyzing your ESLint config** - Reads your ESLint configuration files and extracts the rules you're using
2. **Mapping to Biome equivalents** - Cross-references your ESLint rules with Biome's available rules using the official Biome rules metadata
3. **Providing compatibility report** - Shows which rules have Biome equivalents and which don't
4. **Calculating migration readiness** - Gives you a percentage of how ready your config is for Biome migration

## Usage

Or run directly with:

```bash
npx are-we-biome-yet
```

## Usage

### Basic Analysis

```bash
# Analyze current directory
are-we-biome-yet .

# Analyze specific path
are-we-biome-yet /path/to/your/file.js

# Output as JSON for programmatic use
are-we-biome-yet . --json
```

### Example Output

```
🔍 Analyzing ESLint configuration...

Found 15 ESLint rules in your configuration

✅ Compatible with Biome (13 rules):
  • no-unused-vars → noUnusedVariables (javascript/complexity)
  • no-console → noConsole (javascript/suspicious)
  • prefer-const → useConst (javascript/style)
  • no-var → noVar (javascript/style)
  • semi → useSemicolons (javascript/style)
  • quotes → useSingleQuote (javascript/style)
  • indent → useIndent (javascript/style)
  • comma-dangle → useTrailingCommas (javascript/style)
  • no-trailing-spaces → noTrailingSpaces (javascript/style)
  • eol-last → useNewlineAtEndOfFile (javascript/style)
  • no-multiple-empty-lines → noMultipleEmptyLines (javascript/style)
  • no-tabs → noTabs (javascript/style)
  • no-debugger → noDebugger (javascript/suspicious)

❌ No Biome equivalent (2 rules):
  • @typescript-eslint/no-explicit-any
  • react-hooks/exhaustive-deps

📊 Compatibility: 86.67% (13/15 rules)
```

## Development

### Prerequisites

- Node.js 18+
- Bun (for package management)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/are-we-biome-yet.git
   cd are-we-biome-yet
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Build the project**
   ```bash
   bun run build
   ```

### Project Structure

```
are-we-biome-yet/
├── src/
│   ├── commands/
│   │   ├── analyze.ts    # Main analysis logic
│   │   └── biome.ts      # Biome rules fetching and mapping
│   ├── utils/
│   │   └── logger.ts     # Logging utilities
│   └── index.ts          # CLI entry point
├── biome.json            # Biome configuration
├── package.json          # Dependencies and scripts
├── tsup.config.ts        # Build configuration
└── tsconfig.json         # TypeScript configuration
```

### Key Components

#### `src/commands/analyze.ts`

- Parses ESLint configuration files
- Extracts rules from various ESLint config formats
- Orchestrates the analysis process

#### `src/commands/biome.ts`

- Fetches Biome rules metadata from `https://biomejs.dev/metadata/rules.json`
- Maps ESLint rules to Biome equivalents
- Identifies Biome-exclusive rules

#### `src/utils/logger.ts`

- Provides consistent logging across the application
- Supports different log levels and output formats

### Development Commands

```bash
# Build the project
bun run build

# Run in development mode
bun run dev

# Run tests
bun run test

# Lint with Biome
bun run lint

# Format with Biome
bun run format

# Type check
bun run typecheck
```

### Adding New Features

1. **New Commands**: Add new command files in `src/commands/`
2. **Rule Mappings**: The Biome rules are automatically fetched from the official metadata endpoint
3. **Configuration Parsers**: Extend the ESLint config parsing in `analyze.ts`

### Testing

```bash
# Run tests
bun run test

# Run tests in watch mode
bun run test:watch
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests and linting: `bun run test && bun run lint`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## How it Works

### 1. ESLint Configuration Parsing

The tool supports multiple ESLint configuration formats:

- `.eslintrc.js`
- `.eslintrc.json`
- `.eslintrc.yaml`
- `eslint.config.js` (flat config)
- `package.json` eslint field

### 2. Rule Extraction

Extracts rules from:

- Direct rule configurations
- Extended configurations (like `eslint:recommended`)
- Plugin rules (with proper prefix handling)

### 3. Biome Rule Mapping

- Fetches the latest Biome rules from the official metadata endpoint
- Maps ESLint rules to Biome equivalents based on the `sources` field
- Handles plugin prefixes (e.g., `@typescript-eslint/` → base rule name)

### 4. Compatibility Analysis

- Calculates which rules have Biome equivalents
- Provides detailed mapping information
- Shows compatibility percentage

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Biome](https://biomejs.dev/) team for the excellent tool and metadata API
- ESLint community for the comprehensive linting ecosystem
