
# READ THIS FIRST — the local checkout is usually BEHIND origin

This has wasted days across many sessions. It costs 5 seconds to avoid:

```sh
git fetch origin Master
git log --oneline HEAD..origin/Master   # empty = up to date. NOT empty = local is stale
```

- **Branch from `origin/Master`, never from local `Master`.** On 2026-09-18 a build
  was dispatched from a local `Master` that was 5 commits behind; it would have
  shipped the unresized 1024x1024 / 3000x3000 icons again, undoing production 1062.
- **The working copy has 20+ uncommitted files. That is normal — do not clean it.**
  Never `git stash`, `git reset`, or `git checkout` over them. If a clean tree is
  needed: `git worktree add /tmp/<name> -b <branch> origin/Master`.
- **Before trusting a file's contents, know which ref you read.**
  `git show origin/Master:<path>` is the truth. The working copy can be stale *and*
  carry local edits that exist in no commit — that is exactly what broke
  `eas update`: `app.json` had duplicated `associatedDomains` only in the working
  copy, while git was clean.
- **Verify content, not commit ids.** Master is squash-merged, so merged work gets a
  new SHA and `git merge-base --is-ancestor` wrongly reports "not merged".
- **Read `REPO-MAP.md` before hunting through the tree.** 4442 files, over half of
  them in `externals/`. It says which directories ship, which are inert, and which
  are traps — a plugin whose "committed" server is not committed, an Actions
  workflow at the repo root that never runs, a config nothing imports, an entry
  point that is never typechecked.

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
