const path = require('path');
const fs = require('fs');

class LocalFirstResolverPlugin {
  constructor(options = {}) {
    // Absolute path to the external lib folder.
    this.libPath = options.libPath;
    // Absolute path to the project's node_modules folder.
    this.projectNodeModules = options.projectNodeModules;
  }

  apply(resolver) {
    console.log('resolver', 'running at least');
    // If resolver.hooks exists (Webpack 5), use it
    if (resolver.hooks && resolver.hooks.resolve) {
      resolver.hooks.resolve.tapAsync(
        'LocalFirstResolverPlugin',
        (request, resolveContext, callback) => {
          // If there's no context or issuer, don't modify resolution.
          if (!request.context || !request.context.issuer) {
            return callback();
          }
          const issuer = request.context.issuer;
          // Only modify resolution if the issuer is inside the external lib folder.
          if (!issuer.startsWith(this.libPath)) {
            return callback();
          }
          // Only patch bare module imports.
          if (request.request.startsWith('.') || path.isAbsolute(request.request)) {
            return callback();
          }
          // Build new request path to force resolution from the project's node_modules.
          const newRequestStr = path.resolve(this.projectNodeModules, request.request);
          // Check if the package exists in the consumer's node_modules.
          if (!fs.existsSync(newRequestStr)) {
            // Not found – bypass our custom resolution so default resolution applies.
            return callback();
          }
          const obj = { ...request, request: newRequestStr };
          
          return resolver.doResolve(
            resolver.hooks.resolve,
            obj,
            `LocalFirstResolverPlugin: resolved "${request.request}" as "${newRequestStr}"`,
            resolveContext,
            callback
          );
        }
      );
    }
    // Fallback for older versions of webpack if necessary.
    else if (typeof resolver.plugin === 'function') {
      resolver.plugin('resolve', (request, callback) => {
        if (!request.context || !request.context.issuer) {
          return callback();
        }
        const issuer = request.context.issuer;
        if (!issuer.startsWith(this.libPath)) {
          return callback();
        }
        if (request.request.startsWith('.') || path.isAbsolute(request.request)) {
          return callback();
        }
        const newRequestStr = path.resolve(this.projectNodeModules, request.request);
        // Ensure that the package exists before rewriting.
        if (!fs.existsSync(newRequestStr)) {
          return callback();
        }
        const obj = { ...request, request: newRequestStr };
        return resolver.doResolve(
          'resolve',
          obj,
          `LocalFirstResolverPlugin: resolved "${request.request}" as "${newRequestStr}"`,
          {},
          callback
        );
      });
    }
  }
}

module.exports = LocalFirstResolverPlugin;