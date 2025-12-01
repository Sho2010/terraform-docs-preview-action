# Terraform Docs Preview Action

A GitHub Actions reusable workflow for automatically previewing Terraform Provider documentation using the official Terraform Registry doc-preview tool.

## Features

- Automatically captures screenshots of documentation using [Terraform Registry's doc-preview tool](https://registry.terraform.io/tools/doc-preview)
- Ensures documentation renders exactly as it will appear in the Terraform Registry
- Reusable workflow that can be integrated into any Terraform Provider repository
- No Node.js dependencies required in your provider repository

## Usage

Create a workflow file in your Terraform Provider repository (e.g., `.github/workflows/doc-preview.yaml`):

```yaml
name: Documentation Preview

on:
  pull_request:
    paths:
      - 'docs/**/*.md'

permissions:
  contents: read
  pull-requests: write

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      docs_files: ${{ steps.filter.outputs.docs_files }}
    steps:
      - uses: actions/checkout@v6
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          list-files: json
          filters: |
            docs:
              - 'docs/**/*.md'

  preview:
    needs: detect-changes
    if: needs.detect-changes.outputs.docs_files != '[]'
    uses: Sho2010/terraform-docs-preview-action/.github/workflows/preview.yaml@main
    with:
      changed_files: ${{ needs.detect-changes.outputs.docs_files }}
      # docs_path: 'documentation'  # Optional: customize the docs directory (default: 'docs')
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `docs_path` | Path to the documentation directory | No | `docs` |
| `changed_files` | JSON list of changed markdown files | Yes | - |

### Custom Documentation Directory

If your documentation is in a different directory (e.g., `documentation/`), adjust both the path filter and the `docs_path` input:

```yaml
on:
  pull_request:
    paths:
      - 'documentation/**/*.md'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      docs_files: ${{ steps.filter.outputs.docs_files }}
    steps:
      - uses: actions/checkout@v6
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          list-files: json
          filters: |
            docs:
              - 'documentation/**/*.md'

  preview:
    needs: detect-changes
    if: needs.detect-changes.outputs.docs_files != '[]'
    uses: Sho2010/terraform-docs-preview-action/.github/workflows/preview.yaml@main
    with:
      changed_files: ${{ needs.detect-changes.outputs.docs_files }}
      docs_path: 'documentation'
```

## How It Works

1. Detects changed `.md` files in pull requests
2. For each changed file:
   - Reads the markdown content
   - Navigates to the Terraform Registry doc-preview tool
   - Pastes the content into the preview
   - Captures a screenshot
3. Uploads screenshots as GitHub Actions artifacts
4. Screenshots are retained for 30 days

## Examples

See the [examples](examples/) directory for sample documentation files and their generated previews:
- [Resource documentation example](examples/docs/resource-example.md)
- [Data source documentation example](examples/docs/data-source-example.md)

## Local Testing

To test the preview script locally:

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run the preview script with example files
node scripts/preview-docs.js examples/docs/resource-example.md

# Check the generated screenshot
ls screenshots/
```

## Requirements

- Node.js 20.0.0 or higher
- Playwright (automatically installed in the workflow)

## License

MIT License - see [LICENSE](LICENSE) file for details.
