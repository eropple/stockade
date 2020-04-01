# Code Standards #

- When in doubt, the linters and the configuration files are the boss. If your editor doesn't handle TSLint and `.editorconfig` files, I recommend seeing if there's an extension out there to help.

- Prefix interfaces with `I`, as in `IService` rather than `Service`.

- Try to avoid using single letter generic parameter names unless it's super obvious. `<K, V>` might be obvious for a key-value generic; `<T>` might be obvious for something that doesn't really mutate the generic type and just passes it along; `<T, U>` probably isn't obvious for anything.
