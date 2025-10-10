# Week 4: Product persistence example

A small TypeScript Azure Functions example for CIS3039 Cloud Native DevOps. It develops Product domain validation, a repository port and interchangeable persistence adapters.

At this checkpoint, only the development environment is supplied. There is no application to build or endpoint to call yet.

## Development environment

Clone this repository, open its folder in VS Code and choose **Dev Containers: Reopen in Container**. Install the VS Code Dev Containers extension on the host if needed; a working container runtime is required. Run the commands below in the container terminal, from the repository root.

[The devcontainer configuration](.devcontainer/devcontainer.json) uses `ghcr.io/tpdavison/devops-labs:latest`. This is a floating image tag, so rebuilding later may change the installed tools. It is not a pinned or reproducible image reference.
