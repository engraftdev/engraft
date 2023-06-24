# Overview
The host Python package enables individuals in executing Engraft programs directly within Python scripts. It provides functionality to edit existing Engraft programs or create new ones. The interface is simple -- pass input data to the programs, specify the program name and mode (edit or run), and retrieve the output data (automatically converted to regular python objects).

## run_engraft
Runs the given Engraft program on the provided data.
    Args:
        data: The input data to be passed to the Engraft program.
        program (str): The name of the Engraft program to run. If edit mode is off, the 
        specified program must exist. If edit mode is off and the specified program is 
        not found, the program will be created in the parent file's directory.
        edit (bool): Specifies whether the Engraft program should run in edit mode.

    Returns:
        The output data returned by the Engraft program, deserialized into Python objects.
    
## Dependencies
Currently, the only required dependencies are numpy and the presence of the Engraft executable on your path.