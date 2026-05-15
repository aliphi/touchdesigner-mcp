# TouchDesigner MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)

An **MCP server for TouchDesigner** that lets you control TouchDesigner with Claude (or any [Model Context Protocol](https://modelcontextprotocol.io) client). Create operators, set parameters, and wire networks inside a running TouchDesigner project just by describing what you want — *"make a noise texture chained into a level"* — and watch the operators appear in your patch.

Built for [Claude Code](https://www.anthropic.com/claude-code) but works with any MCP-compatible client (Cline, Continue, Claude Desktop, etc.).

```
  MCP Client  ──stdio──▶  server.js  ──HTTP :9980──▶  Web Server DAT  ─▶  /project1
  (Claude…)              (this repo)                  (inside TD)         (your network)
```

---

## What you need

- **macOS, Linux, or Windows** (instructions are mac/linux; on Windows use the equivalent paths)
- **Node.js 18 or newer** — check with `node -v`. Install via `brew install node` or [nodejs.org](https://nodejs.org).
- **TouchDesigner** — any recent build, [download here](https://derivative.ca/download).
- **Claude Code** — `npm install -g @anthropic-ai/claude-code`, then run `claude` once to log in.

---

## Setup — three steps

### 1. Get the MCP server running

```bash
git clone <this-repo-url> nu-nuk-TouchdesignerClaudeMCP
cd nu-nuk-TouchdesignerClaudeMCP
npm install
```

That installs the two dependencies (`@modelcontextprotocol/sdk`, `zod`). Don't run `node server.js` yourself — Claude Code will start it for you in step 3.

### 2. Set up TouchDesigner to listen

1. Open TouchDesigner (a fresh project is fine — you'll be inside `/project1`).
2. Press **Tab** → **DAT** → **Web Server** to drop a Web Server DAT into the network.
3. In the DAT's parameters:
   - Set **Port** to `9980`
   - Turn **Active** ON
4. Right-click the Web Server DAT → **Edit Callbacks**. A text editor opens.
5. **Replace the entire contents** of that callback file with the contents of [`td_webserver_callback.py`](./td_webserver_callback.py) from this repo. Save.

**Verify it's working:** open `http://localhost:9980` in your browser. You should see:

```json
{"status": "connected", "project": "project1"}
```

If you don't, the DAT isn't Active or the port isn't 9980. Fix that before continuing.

### 3. Register the MCP server with Claude Code

From inside the `nu-nuk-TouchdesignerClaudeMCP` folder, run:

```bash
claude mcp add touchdesigner -- node "$(pwd)/server.js"
```

That's it — Claude Code now knows how to launch the server.

<details>
<summary>Or, register it manually</summary>

Edit `~/.claude.json` and add a `touchdesigner` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "node",
      "args": ["/absolute/path/to/nu-nuk-TouchdesignerClaudeMCP/server.js"]
    }
  }
}
```

Replace `/absolute/path/to/` with your real path.
</details>

---

## Try it

Make sure TD is open with the Web Server DAT active, then in any terminal run `claude` and try:

```
List what's in my TouchDesigner project
```

```
Create a noiseTOP feeding a levelTOP, then a compositeTOP
```

```
Build me a basic 3D scene: a sphere, a camera, a light, and a renderTOP that outputs it all
```

Claude will use the tools below to build the network inside your running TD project. Switch back to TD to watch the operators appear.

---

## What the MCP server exposes

| Tool | What it does |
|---|---|
| `td_list_operators` | List everything at a given path. Always run this first. |
| `td_create_operator` | Create a new operator (TOP/CHOP/SOP/DAT/COMP) at a position |
| `td_set_parameter` | Set a single parameter on an operator |
| `td_connect` | Wire one operator's output into another's input |
| `td_run_python` | Escape hatch — run arbitrary Python inside TD |

Conventions Claude follows (defined in [`CLAUDE.md`](./CLAUDE.md)):
- Everything lives under `/project1`
- Operators spaced 200 horizontal × 150 vertical
- Sources on the left, outputs on the right

---

## Repo layout

```
server.js                    Node MCP server (the thing Claude launches)
td_webserver_callback.py     Paste this into TD's Web Server DAT
CLAUDE.md                    Conventions Claude follows when building networks
package.json                 Node deps
NewProject.toe               Example TD project (optional — you can use your own)
```

---

## Troubleshooting

**"Error connecting to TouchDesigner: fetch failed"**
TD isn't reachable. Check, in order: (a) TD is open, (b) the Web Server DAT exists, (c) its port is `9980`, (d) **Active** is on, (e) `http://localhost:9980` returns the JSON above in your browser.

**Claude says it doesn't have TouchDesigner tools**
The MCP server isn't registered. Run `claude mcp list` — `touchdesigner` should appear. If it doesn't, redo step 3 with an absolute path. After registering, fully quit and reopen Claude Code.

**"Cannot find module '@modelcontextprotocol/sdk'"**
You skipped `npm install`. Run it inside the `nu-nuk-TouchdesignerClaudeMCP` folder.

**Operators get created but `td_set_parameter` errors with "no attribute 'par.foo'"**
That parameter name doesn't exist on that operator type. Ask Claude to use `td_run_python` with `dir(op('/project1/x').par)` to list valid parameters.

**Port 9980 already in use**
Either kill whatever's using it (`lsof -i :9980`) or change the port in both `server.js` (the `TD_PORT` constant near the top) and the Web Server DAT in TD.

---

## How it works under the hood

The MCP server has no domain logic — it serializes Python strings and POSTs them to `http://localhost:9980`. The Web Server DAT's callback tries `eval(code)` first, and if that's a `SyntaxError`, falls back to `exec(code)`. The last expression in the script becomes the HTTP response body, which is why every built-in tool ends with an f-string summary like `f"Connected {…} -> {…}"`.

Security note: the callback runs arbitrary Python with no auth. Keep `localhost` only — don't expose port 9980 to your network.
