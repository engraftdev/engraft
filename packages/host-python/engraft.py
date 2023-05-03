import subprocess
import json

def run_engraft(data, program, *, edit):
    if hasattr(data, "json"):
        data = data.json()

    data = json.dumps(data)   
    
    command = ["engraft", program, "--json-only"]

    if edit:
        command.append("--edit")

    output = subprocess.check_output(command, input=data.encode())
    output = json.loads(output.decode()) 
    return output
