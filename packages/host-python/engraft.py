import subprocess
import json
import numpy as np

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return {"__type": "nd-array", "__value": obj.tolist()}
        return json.JSONEncoder.default(self, obj)    

class CustomDecoder(json.JSONDecoder):
    def decode(self, json_string):
        def object_hook(obj):
            if '__type' in obj:
                if obj['__type'] == 'nd-array':
                    return np.array(obj['__value'])
            return obj
        return json.loads(json_string, object_hook=object_hook) 

def run_engraft(data, program, *, edit):
    if hasattr(data, "json"):
        data = data.json()

    data = json.dumps(data, cls=CustomEncoder)  

    print(data)

    command = ["engraft", program, "--json-only"]

    if edit:
        command.append("--edit")

    output = subprocess.check_output(command, input=data.encode())
    output = CustomDecoder().decode(output)

    return output
