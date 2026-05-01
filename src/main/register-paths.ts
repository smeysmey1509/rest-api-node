import Module from "node:module";
import path from "node:path";

const sourceRoot = __dirname.endsWith(`${path.sep}main`)
  ? path.resolve(__dirname, "..")
  : __dirname;

const aliasPrefix = "@/";
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(
  request: string,
  parent: NodeJS.Module | null | undefined,
  isMain: boolean,
  options?: NodeJS.RequireResolveOptions,
) {
  if (request.startsWith(aliasPrefix)) {
    const resolvedRequest = path.join(sourceRoot, request.slice(aliasPrefix.length));
    return originalResolveFilename.call(this, resolvedRequest, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
