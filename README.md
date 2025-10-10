# Week 4: Product persistence example

A small TypeScript Azure Functions example for CIS3039 Cloud Native DevOps. It develops Product domain validation, a repository port and interchangeable persistence adapters.

## Development environment

Clone this repository, open its folder in VS Code and choose **Dev Containers: Reopen in Container**. Install the VS Code Dev Containers extension on the host if needed; a working container runtime is required. Run the commands below in the container terminal, from the repository root.

[The devcontainer configuration](.devcontainer/devcontainer.json) uses `ghcr.io/tpdavison/devops-labs:latest`. This is a floating image tag, so rebuilding later may change the installed tools. It is not a pinned or reproducible image reference.

## Restore and build

[package.json](package.json) declares Node `22.x`; [tsconfig.json](tsconfig.json) enables strict checking and compiles into `dist/`. The recorded working baseline is Node **22.23.3**, npm **10.9.9**, TypeScript **7.0.2** and Azure Functions Core Tools **4.16.0**. Use the supported container environment; other npm versions have not been verified here.

```sh
node --version
npm --version
func --version
npm ci
npm run build
```

`npm ci` restores [the lockfile](package-lock.json); a successful build exits without compiler errors. Keep the lockfile intact if restoration fails and report the Node/npm versions and error. Do not substitute an unlocked installation as proof that the documented restore works.

`npm test` is an informative placeholder that exits with code 1. There is no supplied automated test suite; compilation does not verify behaviour. `npm run watch` recompiles on changes, and `npm run clean` removes generated `dist/` files.

At this checkpoint the Functions scaffold has no registered application endpoint. A host reporting no functions is not a successful API demonstration.
