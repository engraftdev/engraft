import subprocess
import json
import numpy as np

class _CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return {"__type": "nd-array", "__value": obj.tolist()}
        return json.JSONEncoder.default(self, obj)    

class _CustomDecoder(json.JSONDecoder):
    def decode(self, json_string):
        def object_hook(obj):
            if '__type' in obj:
                if obj['__type'] == 'nd-array':
                    return np.array(obj['__value'])
            return obj
        return json.loads(json_string, object_hook=object_hook) 

def run_engraft(data, program, *, edit):
    """Runs the given Engraft program on the provided data.

    Args:
        data: The input data to be passed to the Engraft program.
        program (str): The name of the Engraft program to run. If edit mode is off, the 
        specified program must exist. If edit mode is off and the specified program is 
        not found, the program will be created in the parent file's directory.
        edit (bool): Specifies whether the Engraft program should run in edit mode.

    Returns:
        The output data returned by the Engraft program, deserialized into Python objects.
    """
    if hasattr(data, "json"):
        data = data.json()

    data = json.dumps(data, cls=_CustomEncoder)  

    command = ["engraft", program, "--json-only"]

    if edit:
        command.append("--edit")

    output = subprocess.check_output(command, input=data.encode())
    output = _CustomDecoder().decode(output)
    return output