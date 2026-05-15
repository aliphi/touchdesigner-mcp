import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Config – change these if TD is on a different host/port
// ---------------------------------------------------------------------------
const TD_HOST = "http://localhost";
const TD_PORT = 9980;

// ---------------------------------------------------------------------------
// Helper: send Python code to TouchDesigner's Web Server DAT
// ---------------------------------------------------------------------------
async function tdExecute(code) {
  try {
    const res = await fetch(`${TD_HOST}:${TD_PORT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: code }),
    });
    const text = await res.text();
    return text;
  } catch (err) {
    return `Error connecting to TouchDesigner: ${err.message}. Is TD running with the Web Server DAT on port ${TD_PORT}?`;
  }
}

// ---------------------------------------------------------------------------
// Create MCP Server
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: "touchdesigner-simple",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Tool 1: Run arbitrary Python in TD
// ---------------------------------------------------------------------------
server.tool(
  "td_run_python",
  `Execute Python code inside TouchDesigner.
Use op() to reference operators. Examples:
  - op('/project1/container1') to get an operator
  - op('/project1').create(constantTOP, 'my_top') to create a TOP
  - op('/project1/my_top').par.colorr = 1.0 to set a parameter
  - op('/project1/my_top').nodeX = 200 to position in the network
Always use full paths starting with /project1.`,
  {
    code: z.string().describe("Python code to execute in TouchDesigner"),
  },
  async ({ code }) => {
    const result = await tdExecute(code);
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 2: Create an operator
// ---------------------------------------------------------------------------
server.tool(
  "td_create_operator",
  `Create a new operator in TouchDesigner.
Operator types use TD class names like:
  TOPs: constantTOP, noiseTOP, compositeTOP, levelTOP, feedbackTOP, moviefileinTOP, renderTOP
  CHOPs: noiseCHOP, lfoCHOP, mathCHOP, filterCHOP, constantCHOP
  SOPs: sphereSOP, boxSOP, gridSOP, noiseSOP, transformSOP
  DATs: textDAT, tableDAT, scriptDAT
  COMPs: geometryCOMP, cameraCOMP, lightCOMP, containerCOMP`,
  {
    parent_path: z
      .string()
      .default("/project1")
      .describe("Parent operator path, e.g. /project1"),
    op_type: z
      .string()
      .describe("Operator type class name, e.g. noiseTOP, sphereSOP"),
    name: z.string().describe("Name for the new operator"),
    x: z.number().default(0).describe("Horizontal position in network"),
    y: z.number().default(0).describe("Vertical position in network"),
  },
  async ({ parent_path, op_type, name, x, y }) => {
    const code = `
n = op('${parent_path}').create(${op_type}, '${name}')
n.nodeX = ${x}
n.nodeY = ${y}
result = f"Created {n.type} at {n.path}"
result
`.trim();
    const result = await tdExecute(code);
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 3: Set a parameter
// ---------------------------------------------------------------------------
server.tool(
  "td_set_parameter",
  `Set a parameter on a TouchDesigner operator.
Common parameter names:
  - TOPs: colorr, colorg, colorb, colora, resolutionw, resolutionh, brightness, contrast, opacity
  - SOPs: radx, rady, radz (radius), tx, ty, tz (translate), rows, cols
  - CHOPs: roughness, amp, freq, period
  - General: display, render, bypass`,
  {
    op_path: z.string().describe("Full path to the operator, e.g. /project1/noise1"),
    param_name: z.string().describe("Parameter name, e.g. colorr, resolutionw"),
    value: z
      .union([z.string(), z.number(), z.boolean()])
      .describe("Value to set"),
  },
  async ({ op_path, param_name, value }) => {
    const pyValue =
      typeof value === "string" ? `'${value}'` : String(value);
    const code = `
op('${op_path}').par.${param_name} = ${pyValue}
f"Set {op('${op_path}').path}.par.${param_name} = ${pyValue}"
`.trim();
    const result = await tdExecute(code);
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 4: Connect two operators
// ---------------------------------------------------------------------------
server.tool(
  "td_connect",
  "Connect the output of one operator to the input of another operator in TouchDesigner.",
  {
    from_path: z.string().describe("Path of the source operator"),
    to_path: z.string().describe("Path of the destination operator"),
    from_output: z.number().default(0).describe("Output index (default 0)"),
    to_input: z.number().default(0).describe("Input index (default 0)"),
  },
  async ({ from_path, to_path, from_output, to_input }) => {
    const code = `
op('${to_path}').inputConnectors[${to_input}].connect(op('${from_path}').outputConnectors[${from_output}])
f"Connected {op('${from_path}').path} -> {op('${to_path}').path}"
`.trim();
    const result = await tdExecute(code);
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 5: List operators in a path
// ---------------------------------------------------------------------------
server.tool(
  "td_list_operators",
  "List all child operators at a given path in TouchDesigner. Useful for inspecting the current state of a network.",
  {
    path: z
      .string()
      .default("/project1")
      .describe("Path to list children of"),
  },
  async ({ path }) => {
    const code = `
children = op('${path}').children
result = '\\n'.join([f"{c.name} ({c.type}) at ({c.nodeX}, {c.nodeY})" for c in children])
result if result else "No operators found"
`.trim();
    const result = await tdExecute(code);
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
