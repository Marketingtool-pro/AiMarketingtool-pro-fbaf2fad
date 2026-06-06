# mise-env-plugin-template

Template for creating [mise](https://mise.jdx.dev) environment plugins.

Environment plugins allow you to set environment variables and PATH entries dynamically based on configuration.

## Getting Started

1. Click "Use this template" to create your own plugin repository
2. Update `metadata.lua` with your plugin information
3. Implement `hooks/mise_env.lua` to set environment variables
4. Optionally implement `hooks/mise_path.lua` to add PATH entries

## Plugin Structure

```
├── metadata.lua           # Plugin metadata (name, version, etc.)
├── hooks/
│   ├── mise_env.lua       # Environment variables hook (required)
│   └── mise_path.lua      # PATH entries hook (optional)
├── .luarc.json            # Lua language server configuration
├── hk.pkl                 # hk linter configuration
├── mise.toml              # mise configuration for development
└── .github/workflows/
    └── ci.yml             # GitHub Actions CI
```

## Hooks

### `mise_env.lua`

Returns a list of environment variables to set:

```lua
function PLUGIN:MiseEnv(ctx)
    return {
        { key = "MY_VAR", value = "my_value" }
    }
end
```

### `mise_path.lua`

Returns a list of paths to prepend to PATH:

```lua
function PLUGIN:MisePath(ctx)
    return { "/path/to/bin" }
end
```

## Development

```bash
# Install development tools
mise install

# Run linter
mise run lint

# Fix linting issues
mise run lint-fix
```

## Documentation

- [Environment Plugin Development Guide](https://mise.jdx.dev/env-plugin-development.html)
- [mise Documentation](https://mise.jdx.dev)
