--- Returns PATH entries to prepend when this plugin is active
--- Documentation: https://mise.jdx.dev/env-plugin-development.html#misepath-hook
--- @param ctx {options: table} Context (options = plugin configuration from mise.toml)
--- @return string[] List of paths to prepend to PATH
function PLUGIN:MisePath(ctx)
	-- Access plugin options from mise.toml configuration
	local _options = ctx.options or {}

	-- Return list of paths to prepend to PATH
	local paths = {}

	-- Example: Add a path from options
	--[[
    if options.path_to_add then
        table.insert(paths, options.path_to_add)
    end
    --]]

	-- Example: Add a computed path
	--[[
    local home = os.getenv("HOME")
    table.insert(paths, home .. "/.local/bin")
    --]]

	return paths
end
