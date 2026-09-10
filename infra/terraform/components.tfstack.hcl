# HCP Terraform Stack configuration
#
# This repository is the mobile application. Cloud infrastructure for
# marketing-tool-484720 is managed in the Google Cloud / Firebase consoles,
# not by Terraform. This stack therefore only holds a bootstrap component so
# that the connected HCP Terraform stack has a valid configuration to load.

required_providers {
random = {
source  = "hashicorp/random"
version = "~> 3.6"
}
}

provider "random" "this" {}

component "bootstrap" {
source = "./bootstrap"

providers = {
random = provider.random.this
}
}

