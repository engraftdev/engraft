# Overview
The host Python package enables individuals in executing engraft programs directly within Python scripts. It provides functionality to edit existing engraft programs or create new ones. The interface is simple -- pass input data to the programs, specify the program name and mode (edit or run), and retrieve the output data (automatically converted to regular python objects).

## run_python
Runs the given engraft program on the provided data.
    Args:
        data: The input data to be passed to the engraft program.
        program (str): The name of the engraft program to run. If edit mode is off, the 
        specified program must exist. If edit mode is off and the specified program is 
        not found, the program will be created in the parent file's directory.
        edit (bool): Specifies whether the engraft program should run in edit mode.

    Returns:
        The output data returned by the engraft program, deserialized into Python objects.
    
## Dependencies
Currently, the only required dependencies are numpy and the presence of the engraft executable on your path.