import subprocess
import json
import escape_data

def useEngraft(data, program, edit):
    # try to serialize the data as json

    if hasattr(data, "json"):
        data = data.json()
        # serialize the data into a single string
        data = json.dumps(data)
    # otherwise, just serialize it
    else:
        data = json.dumps(data)   
    
    data = escape_data.escape_data(data)

    command = f"echo '{data}'| node ../packages/cli/lib/run.js {program}.json --python"

    # if edit is true, open the editor
    if edit:
        command += " --edit"

    try:
        output = subprocess.check_output(command.encode(), shell=True)
    except subprocess.CalledProcessError as e:
        print(f"Command failed with return code {e.returncode}:")
        print(e.output.decode())
        output = e.output
    
    # decode the output
    
    output = output.decode()
    # decode the json
    print(output)
    output = json.loads(output) 
    return output
