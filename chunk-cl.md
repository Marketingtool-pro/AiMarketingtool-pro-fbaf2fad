chunk

 auth

   
 set <provider>               # Store credential (circleci | anthropic | github)

   
 status                      # Check authentication status (CircleCI, Anthropic, GitHub)

   
 remove <provider>           # Remove stored credential (circleci | anthropic | github)


 build-prompt                    # Mine PR comments 
 analyze 
 generate prompt

   --org <org>                     # GitHub org (auto-detected from git remote)

   --repos <items>                 # Comma-separated repo names

   --top <n>                       # Top reviewers to include (default: 5)

   --since <YYYY-MM-DD>            # Start date (default: 3 months ago)

   --output <path>                 # Output path (default: .chunk/context/review-prompt.md)

   --max-comments <n>              # Max comments per reviewer (0 = no limit)

   --analyze-model <model>         # Model for analysis step

   --prompt-model <model>          # Model for prompt generation step

   --include-attribution           # Include reviewer attribution


 config

   
 show                        # Display resolved configuration

   
   --json                      # Output as JSON

   
 set <key> <value>           # Set a config value (see Config keys below)


 init                            # Initialize project configuration

   --force                         # Overwrite existing config

   --skip-hooks                    # Skip hook file generation

   --skip-validate                 # Skip validate command detection

   --skip-completions              # Skip shell completion installation

   --skip-skills                   # Skip agent skill installation

   --skip-test-suites              # Skip .circleci/test-suites.yml scaffolding (default: true; pass =false to generate)

   --project-dir <path>            # Project directory (defaults to cwd)


 task

   
 run                         # Trigger a task run

   
   --definition <name|uuid>    # Definition name or UUID (required)

   
   --prompt <text>             # Prompt text (required)

   
   --branch <branch>           # Branch override

   
   --new-branch                # Create a new branch

   
   --no-pipeline-as-tool       # Disable pipeline-as-tool mode

   
   --json                      # Output as JSON

   
 config                      # Set up .chunk/run.json for this repository

       --force                     # Overwrite existing configuration without confirmation


 skill

   
 install                     # Install all skills

   
 list                        # List skills and install status


 validate                        # Run validation commands

   [name]                          # Optional: run a specific named command

   --dry-run                       # Print commands without executing

   --list                          # List all configured commands

   --json                          # Output as JSON (only applies with --list)

   --cmd <command>                 # Run an inline command

   --save                          # Save --cmd to config

   --remote                        # Run on the active sidecar

   --sidecar-id <id>               # Remote execution in specific sidecar

   --org-id <id>                   # Organization ID (used when creating a new sidecar)

   --identity-file <path>          # SSH identity file for sidecar

   --workdir <path>                # Working directory on sidecar

   --project <path>                # Override project directory

   -e / --env KEY=VALUE            # Set env var in remote sidecar session (repeatable)

   --env-file <path>               # Env file to load (default: .env.local; pass a path to override)


 sidecar

   
 list                        # List sidecars

   
   --org-id <id>               # Organization ID

   
   --all                       # List all sidecars in the org (requires org admin)

   
   --json                      # Output as JSON

   
 create                      # Create a sidecar

   
   --org-id <id>               # Organization ID (see Org ID resolution)

   
   --name <name>               # Sidecar name (auto-generated if omitted)

   
   --image <image>             # E2B template ID or container image

   
 use <id>                    # Set the active sidecar for this project

   
 current                     # Show the active sidecar

   
   --json                      # Output as JSON

   
 forget                      # Clear the active sidecar

   
 exec                        # Execute command in sidecar

   
   --sidecar-id <id>           # Sidecar ID (defaults to active sidecar)

   
   --command <cmd>             # Command to run (required)

   
   --args <args>               # Command arguments

   
 add-ssh-key                 # Add SSH key to sidecar

   
   --sidecar-id <id>           # Sidecar ID (defaults to active sidecar)

   
   --public-key <key>          # SSH public key string

   
   --public-key-file <path>    # Path to public key file

   
 ssh                         # SSH into sidecar

   
   --sidecar-id <id>           # Sidecar ID (defaults to active sidecar)

   
   --identity-file <path>      # SSH identity file

   
   -e / --env KEY=VALUE        # Set env var in remote session (repeatable)

   
   --env-file <path>           # Env file to load (default: .env.local; pass a path to override)

   
 sync                        # Sync files to sidecar

   
   --sidecar-id <id>           # Sidecar ID (defaults to active sidecar)

   
   --identity-file <path>      # SSH identity file

   
   --workdir <path>            # Destination path on sidecar (auto-detected when omitted)

   
 env                         # Detect tech stack and print environment spec as JSON

   
   --dir <path>                # Directory to analyse (default: .)

   
   --no-save                   # Print only, do not save to .chunk/config.json

   
 build                       # Generate Dockerfile and build test image from env spec

   
   --dir <path>                # Directory to write Dockerfile.test and build from

   
   --tag <tag>                 # Image tag (e.g. myapp:latest)

   
 setup                       # Detect env, sync files, and run install steps

   
   --dir <path>                # Directory to detect environment in (default: .)

   
   --sidecar-id <id>           # Sidecar ID (defaults to active sidecar)

   
   --org-id <id>               # Organization ID (used when creating a new sidecar)

   
   --name <name>               # Sidecar name (used when creating a new sidecar)

   
   --identity-file <path>      # SSH identity file

   
   --skip-sync                 # Skip syncing files to the sidecar

   
   --force                     # Re-detect environment even if cached

   
   -e / --env KEY=VALUE        # Set env var in remote sidecar session (repeatable)

   
   --env-file <path>           # Env file to load (default: .env.local; pass a path to override)

   
 snapshot

       
 create                  # Snapshot a sidecar, then delete the source sidecar

       
   --sidecar-id <id>       # Sidecar ID (defaults to active sidecar)

       
   --name <name>           # Snapshot name (required)

       
 get <snapshot-id>       # Get a snapshot by ID

       
   --json                  # Output as JSON

       
 list                    # List snapshots

           --org-id <id>           # Organization ID

           --json                  # Output as JSON


 hook                            # Manage chunk hook execution

   --project <path>                # Override project directory

   
 disable                     # Disable chunk validate hooks

   
 enable                      # Re-enable chunk validate hooks

   
 status                      # Show whether hooks are enabled or disabled


 completion

   
 install                     # Install zsh completion

   
 uninstall                   # Remove zsh completion


 upgrade                         # Update to latest version
