--- Returns environment variables to set when this plugin is active
--- Documentation: https://mise.jdx.dev/env-plugin-development.html#miseenv-hook
--- @param ctx {options: table} Context (options = plugin configuration from mise.toml)
--- @return table[] List of environment variable definitions with key/value pairs
function PLUGIN:MiseEnv(ctx)
	-- Access plugin options from mise.toml configuration
	-- Example mise.toml:
	--   [env_plugins.my-env-plugin]
	--   my_option = "value"
	local _options = ctx.options or {}

	-- Return list of environment variables to set
	local env_vars = {}

	-- Example: Static environment variable
	table.insert(env_vars, {
		key = "MY_ENV_VAR",
		value = "my_value",
	})

	-- Example: Dynamic environment variable from options
	--[[
    if options.api_key then
        table.insert(env_vars, {
            key = "MY_API_KEY",
            value = options.api_key
        })
    end
    --]]

	-- Example: Environment variable with computed value
	--[[
    local home = os.getenv("HOME")
    table.insert(env_vars, {
        key = "MY_CONFIG_DIR",
        value = home .. "/.config/my-tool"
    })
    --]]

	return env_vars
end
