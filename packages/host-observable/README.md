# Engraft-Observable Embedding (Host)

This directory contains the codebase for the host that runs Engraft within [Observable](https://observablehq.com)


[User Guide](https://observablehq.com/@wongyuhao/engraft-embed-docs)

[Developer Doc](https://observablehq.com/@wongyuhao/engraft-embed)


The host is a React component that wraps hooks necessary to run Engraft. 
On the notebook side, there is another React component that wraps this embedding for additional logic (see dev doc).

By convention, code should be written as close to Observable as possible (i.e. in the notebook), and only in this repo when necessary. (e.g. when needing strictly typed code, etc.)

