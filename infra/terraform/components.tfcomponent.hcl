# HCP Terraform Stack configuration
#
# This repository is the mobile application. Cloud infrastructure for
# marketing-tool-484720 is managed in the Google Cloud and Firebase consoles,
# not by Terraform. This stack only holds a bootstrap component so the
# connected HCP Terraform stack has a valid configuration to load.
#
# No providers are used, which keeps the dependency lock file empty.

component "bootstrap" {
source = "./bootstrap"
}
