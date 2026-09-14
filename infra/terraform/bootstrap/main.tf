# Bootstrap component for the marketingtool HCP Terraform stack.
#
# No cloud resources are managed here. Google Cloud and Firebase resources for
# marketing-tool-484720 are managed outside Terraform. This module only gives
# the stack a valid component to plan, and deliberately uses no providers.

variable "project" {
  description = "GCP project ID used by this bootstrap component."
  type        = string
  default     = "marketing-tool-484720"
}

output "project" {
  value = var.project
}
