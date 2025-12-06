# Terraform Docs Preview Action

A GitHub Actions reusable workflow for automatically previewing Terraform Provider documentation using the official Terraform Registry doc-preview tool.

## Features

- Automatically captures screenshots of documentation using [Terraform Registry's doc-preview tool](https://registry.terraform.io/tools/doc-preview)
- Ensures documentation renders exactly as it will appear in the Terraform Registry
- Reusable workflow that can be integrated into any Terraform Provider repository
- No Node.js dependencies required in your provider repository
- **Pluggable storage backends**: Supports multiple object storage providers (AWS S3, Google Cloud Storage, Azure Blob Storage, Cloudflare R2, etc.)

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

### Core Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `docs_path` | Path to the documentation directory | No | `docs` |
| `changed_files` | JSON list of changed markdown files | Yes | - |

### Storage-Specific Inputs

When using the full `terraform-docs-preview.yaml` workflow with storage backend (e.g., S3):

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `aws_region` | AWS region for S3 bucket | Yes | - |
| `role_to_assume` | ARN of the IAM role to assume for AWS credentials | Yes | - |
| `bucket` | S3 bucket name for storing preview images | Yes | - |
| `key_prefix` | Prefix for S3 object keys | No | `terraform-docs-previews` |
| `expires_in` | Expiration time in seconds for presigned URLs (ignored when `use_public_url` is true) | No | `3600` |
| `use_public_url` | Generate public S3 URLs instead of presigned URLs. Requires bucket policy for public read access. | No | `false` |
| `allow_fork` | Whether to allow uploads from forked repositories | No | `false` |

**Note**: Storage-specific inputs vary depending on the storage provider you choose.

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

1. **Change Detection**: Detects changed `.md` files in pull requests
2. **Screenshot Generation**: For each changed file:
   - Reads the markdown content
   - Navigates to the Terraform Registry doc-preview tool
   - Pastes the content into the preview
   - Captures a screenshot
3. **Storage Upload**: Uploads screenshots to your chosen object storage backend (pluggable)
4. **PR Comment**: Posts preview URLs to the pull request for easy review

The architecture is designed with a **pluggable storage layer**, allowing you to choose or implement your preferred object storage provider.

## Examples

See the [examples](examples/) directory for sample documentation files and their generated previews:
- [Resource documentation example](examples/docs/resource-example.md)
- [Data source documentation example](examples/docs/data-source-example.md)

## Storage Backends

This action is designed with a **pluggable storage architecture**, allowing you to use different object storage providers for hosting preview images.

### Supported Storage Providers

The action provides reusable workflows for different storage backends:

- **AWS S3**: `.github/workflows/upload-s3.yaml` (reference implementation)
- **Other providers**: You can implement custom upload workflows following the storage interface contract

### Storage Interface Contract

Any storage backend implementation must follow this contract:

**Inputs:**
- `artifact_name`: Name of the artifact containing screenshots (string, required)
- Provider-specific configuration (credentials, bucket/container names, regions, etc.)

**Outputs:**
- `urls`: JSON array of accessible URLs for preview images (string)

**Security:**
- Should block uploads from forked PRs by default (configurable via `allow_fork` input)

### Using AWS S3 (Reference Implementation)

The `terraform-docs-preview.yaml` workflow includes S3 integration:

```yaml
jobs:
  preview:
    uses: Sho2010/terraform-docs-preview-action/.github/workflows/terraform-docs-preview.yaml@main
    with:
      changed_files: ${{ needs.detect-changes.outputs.docs_files }}
      docs_path: 'docs'
      aws_region: 'ap-northeast-1'
      role_to_assume: 'arn:aws:iam::123456789012:role/github-actions-role'
      bucket: 'my-preview-bucket'
      key_prefix: 'terraform-docs-previews'
      expires_in: '3600'  # 1 hour
      allow_fork: 'false'
```

### Implementing Custom Storage Backends

To implement a custom storage provider (e.g., Google Cloud Storage, Azure Blob, Cloudflare R2):

1. Create a new workflow file (e.g., `.github/workflows/upload-gcs.yaml`)
2. Implement the storage interface contract (inputs and outputs as specified above)
3. Update your orchestration workflow to call your custom upload workflow instead of `upload-s3.yaml`

Example workflow structure:

```yaml
name: Upload to Custom Storage

on:
  workflow_call:
    inputs:
      artifact_name:
        type: string
        required: true
        description: "Name of the artifact containing screenshots"
      # Add your provider-specific inputs here
    outputs:
      urls:
        value: ${{ jobs.upload.outputs.urls }}
```

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

- Node.js 24.0.0 or higher
- Playwright (automatically installed in the workflow)

## License

MIT License - see [LICENSE](LICENSE) file for details.
