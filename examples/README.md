# Examples

This directory contains example Terraform Provider documentation files and their generated preview screenshots.

## Example Files

### Resource Documentation
- **File**: [docs/resource-example.md](docs/resource-example.md)
- **Screenshot**: [../screenshots/resource-example.png](../screenshots/resource-example.png)
- **Description**: Example of a Terraform resource documentation with required/optional/read-only fields

### Data Source Documentation
- **File**: [docs/data-source-example.md](docs/data-source-example.md)
- **Screenshot**: [../screenshots/data-source-example.png](../screenshots/data-source-example.png)
- **Description**: Example of a Terraform data source documentation with filters and nested schemas

## Testing Locally

To test the preview script with these examples:

```bash
# Generate preview for resource example
node scripts/preview-docs.js examples/docs/resource-example.md

# Generate preview for data source example
node scripts/preview-docs.js examples/docs/data-source-example.md

# Check generated screenshots
ls screenshots/
```

## Creating Your Own Examples

1. Create a new markdown file in the `examples/docs/` directory
2. Follow the [Terraform Registry documentation format](https://developer.hashicorp.com/terraform/registry/providers/docs)
3. Run the preview script to generate a screenshot
4. Review the output in the `screenshots/` directory
