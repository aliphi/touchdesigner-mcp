# TouchDesigner MCP Project (nu-nuk-TouchdesignerClaudeMCP)

## What this is
Repo / folder name: `nu-nuk-TouchdesignerClaudeMCP`.
An MCP server that connects to TouchDesigner via a Web Server DAT on port 9980.
You can create, connect, and manipulate TouchDesigner operators through the MCP tools.

## Available tools
- `td_run_python` — run arbitrary Python in TD
- `td_create_operator` — create a new operator (TOP, CHOP, SOP, DAT, COMP)
- `td_set_parameter` — set a parameter on an operator
- `td_connect` — wire two operators together
- `td_list_operators` — see what's in the network

## TouchDesigner basics
- Everything lives under `/project1` by default
- Operators are created with `op('/project1').create(typeName, 'name')`
- Parameters are accessed via `.par.paramname`
- Position operators in the network with `.nodeX` and `.nodeY`
- Wire operators with `.inputConnectors[0].connect(source.outputConnectors[0])`

## Operator type reference
TOPs (textures/video): constantTOP, noiseTOP, compositeTOP, levelTOP, feedbackTOP, renderTOP, circlewTOP, rampTOP, transformTOP, blurTOP, edgeTOP, chromakeyTOP
CHOPs (channels/motion): noiseCHOP, lfoCHOP, mathCHOP, filterCHOP, constantCHOP, waveCHOP
SOPs (3D geometry): sphereSOP, boxSOP, gridSOP, noiseSOP, transformSOP, mergeSOP
DATs (data/text): textDAT, tableDAT, scriptDAT
COMPs (containers/3D): geometryCOMP, cameraCOMP, lightCOMP, containerCOMP

## Layout conventions
- Space operators 200 units apart horizontally
- Space operators 150 units apart vertically
- Source operators on the left, outputs on the right

## Important
- Always use full paths starting with /project1
- Check what exists first with td_list_operators before creating
- After creating operators, connect them to build the signal chain
