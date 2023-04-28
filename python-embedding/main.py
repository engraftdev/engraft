import subprocess
import json

def useEngraft(data, program, edit):
    if hasattr(data, "json"):
        data = json.dumps(data.json())
    else:
        data = json.dumps(data)   
    
    command = f"node ../packages/cli/lib/run.js {program}.json --python"

    if edit:
        command += " --edit"

    try:
        output = subprocess.check_output(command.encode(), shell=True, input=data.encode())
    except subprocess.CalledProcessError as e:
        print(f"Command failed with return code {e.returncode}:")
        print(e.output.decode())
        output = e.output
    
    
    output = output.decode()
    print(output)
    output = json.loads(output) 
    return output
