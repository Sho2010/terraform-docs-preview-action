# Terraform Docs Preview Action - Developer Documentation

This document provides technical details about the implementation and architecture of the Terraform Docs Preview Action.

## Project Overview

This GitHub Actions reusable workflow automatically generates preview screenshots of Terraform Provider documentation using the official Terraform Registry doc-preview tool. It helps reviewers visualize how documentation changes will appear in the Terraform Registry.

## Architecture

The action consists of multiple reusable workflows that form a pipeline:

```
terraform-docs-preview.yaml (main orchestrator)
  ├── detect (job) - Detects changed markdown files
  ├── generate (job) → create-preview-image.yaml
  │   └── Generates screenshots using Playwright
  ├── upload-s3 (job) → upload-s3.yaml
  │   └── Uploads screenshots to S3 and generates URLs
  └── comment (job) → preview-comment.yaml
      └── Posts preview images to PR comments
```

### Workflow Files

#### 1. `terraform-docs-preview.yaml`

Main orchestrator workflow that coordinates the entire preview generation process.

**Key Features:**
- Accepts workflow_call inputs for configuration
- Detects changed markdown files in the specified `docs_path`
- Conditionally runs downstream jobs based on file changes
- Passes data between jobs using outputs

**Important Inputs:**
- `docs_path`: Directory containing documentation (default: `docs`)
- `aws_region`, `role_to_assume`, `bucket`: AWS S3 configuration
- `use_public_url`: Toggle between presigned URLs and public URLs
- `allow_fork`: Security control for fork PR uploads

#### 2. `create-preview-image.yaml`

Generates preview screenshots using Playwright.

**Process:**
1. Checks out the action repository (not the caller's repo)
2. Installs Node.js and Playwright
3. For each changed file:
   - Reads markdown content
   - Opens Terraform Registry doc-preview tool
   - Pastes content and captures screenshot
4. Uploads screenshots as GitHub Actions artifacts

**Key Implementation Details:**
- Uses `scripts/preview-docs.js` to drive Playwright
- Screenshots are stored in `screenshots/` directory
- Artifact name: `terraform-docs-screenshots`

#### 3. `upload-s3.yaml`

Handles S3 upload and URL generation.

**Process:**
1. Authenticates with AWS using OIDC
2. Downloads screenshot artifacts
3. Uploads images to S3 with organized key structure
4. Generates URLs (presigned or public based on configuration)
5. Outputs JSON array of URLs

**Security Features:**
- Blocks fork PR uploads by default (unless `allow_fork: "true"`)
- Uses OIDC for keyless AWS authentication
- Supports both presigned URLs (temporary) and public URLs (permanent)

**⚠️ Critical Limitation with OIDC:**
- Presigned URLs **do not work** with OIDC authentication because OIDC provides temporary credentials that expire
- When using OIDC (recommended), you **must** set `USE_PUBLIC_URL=true` or `use_public_url: "true"` in the workflow
- Presigned URLs only work with long-lived AWS access keys (not recommended for security reasons)

**Implementation:**
- Uses `scripts/upload-to-s3.js` for S3 operations
- S3 key pattern: `{key_prefix}/{repo-owner}/{repo-name}/{pr-number}/{filename}.png`

#### 4. `preview-comment.yaml`

Posts preview images to PR comments.

**Process:**
1. Downloads GitHub token artifact (if available)
2. Posts or updates PR comment with preview images
3. Formats images in markdown for easy viewing

**Key Features:**
- Updates existing comment if found (avoids spam)
- Shows file paths and corresponding preview images
- Handles both presigned and public URLs

### Scripts

#### `scripts/preview-docs.js`

Node.js script using Playwright to capture screenshots.

**Functionality:**
- Launches Chromium browser in headless mode
- Navigates to Terraform Registry doc-preview tool
- Fills markdown content into the preview form
- Waits for rendering and captures screenshot
- Handles multiple files sequentially

**Technical Details:**
- Uses Playwright's page.fill() for content injection
- Implements proper waiting for page load
- Saves screenshots with sanitized filenames

#### `scripts/upload-to-s3.js`

Node.js script for S3 upload and URL generation.

**Functionality:**
- Lists all PNG files in screenshots directory
- Uploads each file to S3 with organized key structure
- Generates appropriate URLs based on `USE_PUBLIC_URL` environment variable
- Outputs JSON array of URLs for downstream consumption

**Environment Variables:**
- `BUCKET`: S3 bucket name
- `PREFIX`: S3 key prefix (default: `terraform-docs-previews`)
- `EXPIRES_IN`: Expiration time for presigned URLs in seconds (default: `3600`)
- `USE_PUBLIC_URL`: If `"true"`, generates public URLs instead of presigned URLs

**Technical Details:**
- Uses AWS SDK v3 (@aws-sdk/client-s3)
- Key pattern: `{PREFIX}/{owner}/{repo}/{pr}/{filename}`
- Public URL format: `https://{bucket}.s3.{region}.amazonaws.com/{key}`
- Presigned URL: Generated using `@aws-sdk/s3-request-presigner`

## Key Implementation Patterns

### 1. Action Repository Checkout

The workflows checkout the action repository (not the caller's repository) to access scripts:

```yaml
- name: Checkout action repository
  uses: actions/checkout@v6
  with:
    repository: Sho2010/terraform-docs-preview-action
    ref: ${{ inputs.action_ref || github.action_ref }}
```

This allows the action to self-contain all necessary scripts and dependencies.

### 2. Change Detection

Uses `tj-actions/changed-files` to detect changed markdown files:

```yaml
- uses: tj-actions/changed-files@v45
  id: changed
  with:
    files: |
      ${{ inputs.docs_path }}/**/*.md
    json: true
    escape_json: false
```

The JSON output is passed to downstream jobs.

### 3. Conditional Job Execution

Jobs are conditionally executed based on change detection:

```yaml
if: needs.detect.outputs.changed != '[]'
```

This prevents unnecessary workflow runs when no documentation files are changed.

### 4. Fork PR Security

Upload jobs block fork PR access by default:

```yaml
if: >
  github.event_name != 'pull_request' ||
  github.event.pull_request.head.repo.full_name == github.event.pull_request.base.repo.full_name ||
  inputs.allow_fork == 'true'
```

This prevents unauthorized S3 uploads from forked repositories.

### 5. Data Flow Between Jobs

Data flows through job outputs:

```yaml
outputs:
  urls: ${{ jobs.upload-s3.outputs.urls }}
```

The main workflow exposes the final URLs as workflow outputs.

## AWS Setup

### Required AWS Resources

1. **S3 Bucket**: Storage for preview images
2. **IAM Role**: GitHub Actions OIDC role with appropriate permissions
3. **Bucket Policy** (optional): For public URL access

### IAM Role Configuration

The IAM role must have:
- Trust relationship with GitHub Actions OIDC provider
- Permissions for `s3:PutObject` and `s3:GetObject`

Example trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:*"
        }
      }
    }
  ]
}
```

### Bucket Policy for Public URLs

⚠️ **When using OIDC authentication (recommended), you MUST use public URLs.** Presigned URLs will not work with OIDC's temporary credentials.

If using `use_public_url: "true"` (required for OIDC), configure bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket/terraform-docs-previews/*"
    }
  ]
}
```

Also ensure the bucket's block public access settings allow public access.

## Development Workflow

### Local Testing

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

3. Test preview generation:
   ```bash
   node scripts/preview-docs.js examples/docs/resource-example.md
   ```

4. Test S3 upload (requires AWS credentials):
   ```bash
   export BUCKET=your-bucket
   export PREFIX=test-previews
   export EXPIRES_IN=3600
   export USE_PUBLIC_URL=false
   node scripts/upload-to-s3.js
   ```

### Testing Workflows

Use the test workflows in `.github/workflows/`:

- `test-example.yaml`: Tests the full workflow with example documentation
- `test-user-scenario.yaml`: Tests specific user scenarios

## Common Issues and Solutions

### Issue: Presigned URLs return 403 Forbidden or expire immediately

**Cause**: You are using OIDC authentication with presigned URLs. OIDC provides temporary credentials that expire, making presigned URLs generated from these credentials invalid.

**Solution**: ⚠️ **This is the most common issue!** Set `use_public_url: "true"` in your workflow configuration and configure bucket policy for public access. Presigned URLs are not compatible with OIDC authentication.

```yaml
with:
  use_public_url: "true"  # REQUIRED when using OIDC
```

### Issue: Screenshots are blank

**Cause**: The Playwright script may not be waiting long enough for the preview to render.

**Solution**: Increase wait time in `preview-docs.js` or add explicit wait for specific elements.

### Issue: Fork PR uploads are blocked

**Cause**: Default security setting blocks fork PR uploads.

**Solution**: Set `allow_fork: "true"` if you trust fork PR authors. Otherwise, this is expected behavior.

### Issue: Public URLs return 403 Forbidden

**Cause**: Bucket policy doesn't allow public access or bucket has block public access enabled.

**Solution**: Configure bucket policy and disable block public access settings for the specific prefix. See the AWS Setup section for the correct bucket policy configuration.

## Future Enhancements

Potential areas for improvement:

1. **Pluggable Storage Backends**: Abstract the storage layer to support GCS, Azure Blob, Cloudflare R2
2. **Parallel Screenshot Generation**: Generate screenshots concurrently for faster processing
3. **Caching**: Cache unchanged screenshots to reduce processing time
4. **Custom Styling**: Support custom CSS for preview rendering
5. **Diff Highlighting**: Highlight differences between versions in PR comments
6. **Multi-provider Support**: Support different Terraform registry preview tools

## Contributing

When contributing to this project:

1. Test changes locally using the test scripts
2. Update documentation in both README.md and claude.md
3. Add test workflows for new features
4. Ensure backwards compatibility with existing configurations
5. Update examples directory with new use cases
