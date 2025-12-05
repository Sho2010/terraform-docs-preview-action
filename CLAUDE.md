# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a GitHub Action that provides reusable workflows for automatically previewing Terraform Provider documentation. It uses Playwright to automate the Terraform Registry's doc-preview tool, capturing screenshots of how documentation will appear in the official registry.

## Local Development Commands

```bash
# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium

# Generate a preview screenshot locally
node scripts/preview-docs.js <path-to-markdown-file>

# Example with example files
node scripts/preview-docs.js examples/docs/resource-example.md

# Screenshots are saved to ./screenshots/
```

**Requirements**: Node.js 24.0.0 or higher

## Architecture

This repository provides **reusable workflows** meant to be called from Terraform Provider repositories. The workflows are composed in a modular pipeline with **pluggable storage backends**:

### Main Entry Point
- **`terraform-docs-preview.yaml`**: Main orchestration workflow
  - Detects changed markdown files in the docs directory
  - Calls the generate → upload → comment pipeline
  - Accepts storage-specific inputs (e.g., AWS parameters for S3)
  - Can be adapted to call different upload workflows for different storage providers

### Workflow Components
1. **`create-preview-image.yaml`**: Screenshot generation (storage-agnostic)
   - Checks out both the caller repo (for docs) and this action repo (for script)
   - Runs `scripts/preview-docs.js` for each changed file
   - Outputs screenshots to local filesystem for storage backend to process

2. **Storage Upload Workflows** (pluggable layer):
   - **`upload-s3.yaml`**: Reference implementation for AWS S3
     - Authenticates via AWS OIDC
     - Uploads PNGs to S3 with pattern: `{prefix}/{repo}/{run_id}/{filename}`
     - Generates presigned URLs (default 1-hour expiration)
     - **Security**: Blocks fork PRs by default unless `allow_fork: "true"`
   - Other storage providers (GCS, Azure Blob, R2, etc.) can be implemented following the same interface:
     - Input: `artifact_name`, provider-specific credentials/config
     - Output: `urls` (JSON array of accessible URLs)

3. **`preview-comment.yaml`**: PR comment posting (storage-agnostic)
   - Formats and posts preview URLs to PR comments
   - Displays preview count and changed files list
   - Works with any storage backend that provides URLs

### Core Script
- **`scripts/preview-docs.js`**: Playwright automation
  - Navigates to `https://registry.terraform.io/tools/doc-preview`
  - Handles privacy modal (multi-language support)
  - Pastes markdown content and waits for render
  - Captures full-page screenshot

## Key Design Decisions

- **No dependencies in caller repos**: All Node.js/Playwright dependencies are contained in this action repo
- **Reusable workflows**: Caller repos reference workflows via `uses: Sho2010/terraform-docs-preview-action/.github/workflows/...@version`
- **Pluggable storage backends**: The upload layer is abstracted, allowing different object storage providers (S3, GCS, Azure Blob, R2, etc.) to be swapped by implementing the storage interface contract
- **Storage interface contract**: Upload workflows must accept storage-specific inputs and output a `urls` JSON array for preview access
- **Fork security**: Storage uploads should deny fork PRs by default to prevent abuse

## Workflow Input Descriptions

All reusable workflows use `workflow_call` with properly documented inputs. When adding or modifying workflow inputs, always include a `description` field explaining the parameter's purpose.
