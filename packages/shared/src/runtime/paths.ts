import fs from "fs";
import path from "path";

const hasWorkspaceMarkers = (directory: string) =>
  fs.existsSync(path.join(directory, "package-lock.json")) &&
  fs.existsSync(path.join(directory, "services")) &&
  fs.existsSync(path.join(directory, "packages"));

export const findWorkspaceRoot = (startDirectory = process.cwd()) => {
  let currentDirectory = path.resolve(startDirectory);

  while (currentDirectory !== path.dirname(currentDirectory)) {
    if (hasWorkspaceMarkers(currentDirectory)) {
      return currentDirectory;
    }

    currentDirectory = path.dirname(currentDirectory);
  }

  return path.resolve(startDirectory);
};

export const workspaceRoot = findWorkspaceRoot();

export const resolveWorkspacePath = (...segments: string[]) =>
  path.join(workspaceRoot, ...segments);
