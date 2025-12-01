---
page_title: "test_resource Resource - terraform-provider-test"
subcategory: ""
description: |-
  Test resource for documentation preview
---

# test_resource (Resource)

This is a test resource for validating the documentation preview workflow.

## Example Usage

```terraform
resource "test_resource" "example" {
  name        = "example"
  description = "This is an example resource"
  enabled     = true

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}
```

## Schema

### Required

- `name` (String) The name of the resource. Must be unique within the provider.

### Optional

- `description` (String) A description of the resource.
- `enabled` (Boolean) Whether the resource is enabled. Defaults to `true`.
- `tags` (Map of String) A map of tags to assign to the resource.

### Read-Only

- `id` (String) The ID of the resource.
- `created_at` (String) The timestamp when the resource was created.
- `updated_at` (String) The timestamp when the resource was last updated.

## Import

Test resources can be imported using the resource `id`:

```shell
terraform import test_resource.example resource-id-123
```
