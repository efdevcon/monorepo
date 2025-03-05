// A custom resolver plugin that forces resolution to use the standard "node_modules"
// lookup if the importing file (the issuer) is coming from an installed package.
class PriorityNodeModulesResolverPlugin {
  apply(resolver) {
    // Tap into the 'resolve' hook (this is valid in webpack 5's "enhanced-resolve")
    resolver.getHook('resolve').tapAsync(
      'PriorityNodeModulesResolverPlugin',
      (request, resolveContext, callback) => {
        // Check if there is an issuer (the file doing the importing)
        // and if its path includes "node_modules" (i.e. it comes from an installed package)
        const issuer = request.context && request.context.issuer;

        if (issuer && issuer.includes('node_modules')) {

          if (issuer.includes('@react-three/drei') && request.request.includes('zustand')) {
            // console.log('request.context.resolveOptions', request);
            request.context.resolveOptions = {
              ...(request.context.resolveOptions || {}),
              modules: ['node_modules']
            };
            // request.context.resolveOptions.modules = ['node_modules'];
          }
          // Override the resolve.modules array for this request so that only the plain "node_modules" is used.
          if (request.context.resolveOptions && Array.isArray(request.context.resolveOptions.modules)) {
            // Override the modules as needed.
            request.context.resolveOptions.modules = ['node_modules'];
          }
        }

        // Pass the modified request along.
        callback();
      }
    );
  }
}

module.exports = PriorityNodeModulesResolverPlugin;