---
page_title: "waroom_service Data Source - terraform-provider-waroom"
subcategory: ""
description: |-
  Retrieves information about a Waroom service
---

# waroom_service (Data Source)

test1
Use this data source to retrieve information about an existing Waroom service.

## Example Usage

### Basic Usage

```terraform
data "waroom_service" "example" {
  service_id = "srv-123456"
}

output "service_name" {
  value = data.waroom_service.example.name
}
```

### Filter by Name

```terraform
data "waroom_service" "by_name" {
  filter {
    name   = "name"
    values = ["production-api"]
  }
}
```

### Multiple Filters

```terraform
data "waroom_service" "filtered" {
  filter {
    name   = "status"
    values = ["active"]
  }

  filter {
    name   = "environment"
    values = ["production", "staging"]
  }
}
```

## Schema

### Optional

- `service_id` (String) The unique identifier of the service. If not specified, filters must be used.
- `filter` (Block List) One or more filter blocks to narrow down results (see [below for nested schema](#nestedblock--filter))

### Read-Only

- `id` (String) The ID of this resource.
- `name` (String) The name of the service.
- `description` (String) A description of the service.
- `status` (String) The current status of the service. Possible values: `active`, `inactive`, `maintenance`.
- `endpoint_url` (String) The endpoint URL of the service.
- `version` (String) The version of the service.
- `created_at` (String) The timestamp when the service was created (RFC3339 format).
- `updated_at` (String) The timestamp when the service was last updated (RFC3339 format).
- `labels` (Map of String) A map of labels associated with the service.
- `metadata` (Map of String) Additional metadata about the service.

<a id="nestedblock--filter"></a>
### Nested Schema for `filter`

Required:

- `name` (String) The name of the filter field.
- `values` (List of String) The values to filter by.

## Attributes Reference

In addition to all arguments above, the following attributes are exported:

- `owner_id` (String) The ID of the service owner.
- `region` (String) The region where the service is deployed.
- `health_check_url` (String) The URL for service health checks.
