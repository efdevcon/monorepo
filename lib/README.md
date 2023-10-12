Currently "lib" is not packaged.
All dependencies must be installed by the importer.

Cons:
Components in lib aren't self-contained, and may break if dependencies are misconfigured
Cannot easily be packaged and consumed by a 3rd party
Requires some TS configuration to work with monorepos (specifically, have to add paths for peer dependencies like react and react-dom)

Pros:
No need to run a script to continuously package "lib" when developing. The code is like an "extension" of the importing codebase.
