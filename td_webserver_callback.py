# ===========================================================================
# TOUCHDESIGNER SETUP — paste this into a Web Server DAT's callbacks
# ===========================================================================
# 
# Steps in TouchDesigner:
# 1. Open TouchDesigner (fresh project is fine)
# 2. In /project1, create a "Web Server DAT"
#    - Tab > DAT > Web Server
# 3. Set its port to 9980
# 4. Right-click the Web Server DAT > Edit Callbacks
# 5. Replace ALL the callback code with this entire file
# 6. Turn on the Active toggle on the Web Server DAT
# ===========================================================================

import json

def onHTTPRequest(webServerDAT, request, response):
    """Handle incoming requests from the MCP server."""
    
    # Handle POST requests with Python code
    if request['method'] == 'POST':
        try:
            body = json.loads(request['data'])
            code = body.get('script', '')
            
            # Execute the Python code in TD's environment
            try:
                result = eval(code)
                if result is not None:
                    response['statusCode'] = 200
                    response['statusReason'] = 'OK'
                    response['data'] = str(result)
                else:
                    # If eval doesn't return anything, try exec
                    exec(code)
                    response['statusCode'] = 200
                    response['statusReason'] = 'OK'
                    response['data'] = 'OK - executed successfully'
            except SyntaxError:
                # eval failed, use exec for statements
                try:
                    exec(code)
                    response['statusCode'] = 200
                    response['statusReason'] = 'OK'
                    response['data'] = 'OK - executed successfully'
                except Exception as e:
                    response['statusCode'] = 500
                    response['statusReason'] = 'Error'
                    response['data'] = f'Execution error: {str(e)}'
            except Exception as e:
                response['statusCode'] = 500
                response['statusReason'] = 'Error'
                response['data'] = f'Error: {str(e)}'
        except json.JSONDecodeError:
            response['statusCode'] = 400
            response['statusReason'] = 'Bad Request'
            response['data'] = 'Invalid JSON'
    
    # Handle GET requests — health check
    elif request['method'] == 'GET':
        response['statusCode'] = 200
        response['statusReason'] = 'OK'
        response['data'] = json.dumps({
            'status': 'connected',
            'project': project.name
        })
    
    return response
