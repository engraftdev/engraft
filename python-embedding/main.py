import subprocess
import json

def useEngraft(data, program, edit):
    command = f"echo {data} | node ../packages/cli/lib/run.js {program}.json"

    if edit:
        command+= " --edit"
    
    try:
        output = subprocess.check_output(command, shell=True)
    except subprocess.CalledProcessError as e:
        print(f"Command failed with return code {e.returncode}:")
        print(e.output.decode())
        output = e.output
    
    try:
        output = output.decode()
    except AttributeError:
        pass

    try:
        json.loads(output)
    except ValueError as e:
        #remove the word "here" from the output
        try:
            output = output.split("here")[1]
        except IndexError:
            pass
        output = json.dumps({"output": output})

    return output
