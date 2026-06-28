import Module from "node:module";
import path from "node:path";
import { resolveWorkspacePath } from "./runtime/paths";

type ResolveFilename = (
  request: string,
  parent: NodeJS.Module | null | undefined,
  isMain: boolean,
  options?: NodeJS.RequireResolveOptions,
) => string;

type ModuleWithPrivateResolver = typeof Module & {
  _resolveFilename: ResolveFilename;
};

const moduleWithResolver = Module as ModuleWithPrivateResolver;
const originalResolveFilename = moduleWithResolver._resolveFilename;

const isCompiledRuntime = __dirname.includes(`${path.sep}dist${path.sep}packages${path.sep}shared${path.sep}src`);

const aliasRoots = [
  {
    prefix: "@shared/",
    directory: isCompiledRuntime
      ? resolveWorkspacePath("dist", "packages", "shared", "src")
      : resolveWorkspacePath("packages", "shared", "src"),
  },
  {
    prefix: "@services/",
    directory: isCompiledRuntime ? resolveWorkspacePath("dist", "services") : resolveWorkspacePath("services"),
  },
];

moduleWithResolver._resolveFilename = function resolveFilename(
  request: string,
  parent: NodeJS.Module | null | undefined,
  isMain: boolean,
  options?: NodeJS.RequireResolveOptions,
) {
  const alias = aliasRoots.find(({ prefix }) => request.startsWith(prefix));

  if (alias) {
    const resolvedRequest = path.join(alias.directory, request.slice(alias.prefix.length));
    return originalResolveFilename.call(this, resolvedRequest, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
