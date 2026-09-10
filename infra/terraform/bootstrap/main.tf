# Bootstrap component for the marketingtool HCP Terraform stack.
#
# No cloud resources are managed here. Google Cloud and Firebase resources for
# marketing-tool-484720 are managed outside Terraform. This module only gives
# the stack a valid component to plan.

terraform {
required_providers {
random = {
source  = "hashicorp/random"
version = "~> 3.6"
}
}
}

resource "random_id" "stack_bootstrap" {
byte_length = 8
}

output "stack_bootstrap_id" {
value = random_id.stack_bootstrap.hex
}

