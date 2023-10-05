Currently "common" is not packaged.
All dependencies must be installed by the importer.

Cons:
Components in common aren't self-contained, and may break if dependencies are misconfigured
Cannot easily be packaged and consumed by a 3rd party

Pros:
No need to run a script to continuously package "common" when developing. The code is like an "extension" of the importing codebase.
