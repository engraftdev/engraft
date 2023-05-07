import subprocess
import json
import numpy as np

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return {"__type": "nd-array", "__value": obj.tolist()}
        return json.JSONEncoder.default(self, obj)        

def run_engraft(data, program, *, edit):
    if hasattr(data, "json"):
        data = data.json()

    data = json.dumps(data, cls=CustomEncoder)   
    
    command = ["engraft", program, "--json-only"]

    if edit:
        command.append("--edit")

    output = subprocess.check_output(command, input=data.encode())
    output = json.loads(output.decode()) 
    return output
