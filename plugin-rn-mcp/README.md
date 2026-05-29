# marketingtool-rn-mcp

A Claude Code plugin that lets Claude **drive, inspect, and debug the running
AiMarketingtool-pro React Native app** (`pro.marketingtool.app`) on an Android
device, through a vendored, offline [`react-native-mcp-kit`](https://github.com/pranko17/react-native-mcp-kit)
MCP server (pinned to **4.4.0**).

> This is a **developer / testing tool**. It observes and drives the app from
> *outside*, via the OS gesture pipeline. It does **not** touch the app's auth
> (Firebase / Appwrite), the AI Router, Supabase, or any vendor API.

## What it provides

The MCP server exposes 6 tools:

| Tool | Purpose |
| --- | --- |
| `call` | Invoke an exposed app/host action through the real OS gesture pipeline |
| `wait_until` | Block until a condition on the running app becomes true |
| `assert` | Assert a condition about the running app's current state |
| `list_tools` | List the tools the connected RN host modules expose |
| `describe_tool` | Describe the signature/parameters of a specific tool |
| `connection_status` | Report the bridge / host-module connection status |

## Requirements

- **Apple Silicon (arm64) macOS** — the vendored `sharp` native binary is
  `darwin-arm64` only.
- **Node.js** on `PATH` (the server runs as `node …/cli.js`).
- A running Android device/emulator with the app installed, for the tools to
  actually connect to (`connection_status` reports the bridge state).

## Install (via the repo marketplace)

```sh
/plugin marketplace add Marketingtool-pro/AiMarketingtool-pro-fbaf2fad
/plugin install marketingtool-rn-mcp@marketingtool-pro
```

The server's `node_modules` is **committed**, so it runs with **no install
step** after clone. Verify it is connected with `/mcp`.

## How it's wired

`.mcp.json` launches the vendored server with a portable plugin-root path:

```json
{
  "mcpServers": {
    "rn-mcp-kit": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server/node_modules/react-native-mcp-kit/dist/server/cli.js"],
      "env": { "APP_ID": "pro.marketingtool.app", "PLATFORM": "android" }
    }
  }
}
```

## Updating the pinned server version

```sh
cd plugin-rn-mcp/server
# edit the version in package.json, then:
rm -rf node_modules package-lock.json
npm install --omit=dev --omit=peer
```

Commit the regenerated `server/node_modules`.
