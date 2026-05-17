import Module from "node:module";
import path from "node:path";

type ResolveFilename = (
  request: string,
  parent: NodeJS.Module | null | undefined,
  isMain: boolean,
  options?: NodeJS.RequireResolveOptions,
) => string;

type ModuleWithPrivateResolver = typeof Module & {
  _resolveFilename: ResolveFilename;
};

const sourceRoot = __dirname;

const aliasPrefix = "@/";
const moduleWithResolver = Module as ModuleWithPrivateResolver;
const originalResolveFilename = moduleWithResolver._resolveFilename;

moduleWithResolver._resolveFilename = function resolveFilename(
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
