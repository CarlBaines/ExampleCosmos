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

The Functions project began as a scaffold; the current checkpoint adds local domain capabilities but has no registered application endpoint yet.

## Domain factory and student exercise

[product.ts](src/domain/product.ts) defines `Product`, `createProduct` and `ProductError`. TypeScript checks shape at compile time; calling `createProduct` performs runtime validation. The factory requires non-blank ID, name and description, non-negative integer `pricePence`, and a valid `Date` for `updatedAt`. Money is represented as integer pence.

```sh
npm run demo:domain
```

[The domain demo](scripts/demo-domain.ts) builds first, then creates and displays a Product whose name is 101 ASCII characters long. That succeeds in the supplied starting state: the maximum-length rule is deliberately absent. This is a console demonstration, not an assertion-based test.

The worksheet exercise adds a maximum name length of 100, measured using the supplied string's JavaScript `.length`. Preserve the existing blank-name checks without adding trimming or normalisation. ASCII names of 99 and 100 characters must succeed; 101 must raise `ProductError` with `field === 'name'`. After that change, the same demo catches and displays the name error instead of a Product. Use the exercise requirements to check the boundary cases; this demo alone does not test all three.

In `scripts/demo-domain.ts`, change the name expression to `'A'.repeat(99)`, save and run `npm run demo:domain`. Repeat with 100 and 101. The command rebuilds each time. Expect Product creation for 99 and 100, and `ProductError (field: name)` for 101 after implementing the rule. Temporarily try `name: '   '` to confirm blank-name rejection, then restore the 101-character example. Inspect the displayed result: the demo catches name errors, so exit status alone does not prove correctness. Rejecting all three lengths is incorrect.

No solution is supplied here. The direct domain demo needs no Azure account or credentials.

## Repository port

[ProductRepo](src/domain/product-repo.ts) describes the storage contract used by this example. Defining this interface does not provide storage.

| Operation | Asynchronous result and meaning |
| --- | --- |
| `getById(id)` | `Product` or `null` when absent |
| `list()` | `Product[]`, including an empty array when there are no products |
| `save(product)` | Upsert by ID: create or replace, then return the saved Product |
| `delete(id)` | Complete without a value; an absent item is a no-op |

Storage, network and authentication failures reject promises. The domain port contains no Azure SDK or HTTP types. These operations do not provide reservation concurrency protection.

## In-memory adapter

[FakeProductRepo](src/infra/fake-product-repo.ts) implements the port using a process-local `Map`. Supply valid Products constructed through the factory. The adapter copies both Product fields and the mutable `updatedAt` date on input and output, so changing an external object or date cannot change its stored copy.

This is temporary in-memory data: it disappears when the process ends. It is useful for tracing the port without a database, but does not demonstrate durable persistence or concurrency between processes. Use the fake-backed list demo below to run the adapter through the application use case.

## List use case without Azure

```sh
npm run demo:list -- fake
```

[The list demo](scripts/demo-list.ts) constructs a deterministic sample Product through `createProduct`, puts it in `FakeProductRepo` and calls [listProducts](src/app/list-products.ts) with `{ productRepo }`. It prints `Adapter: FakeProductRepo` followed by JSON with `success: true` and a `data` array containing `demo-product-1`. The sample date is fixed at `2026-01-01T00:00:00.000Z`.

This command needs neither Azure credentials nor cloud resources. The use case depends on the repository port, not an adapter. Its result distinguishes `{ success: true, data }` from `{ success: false, error }`, and handles thrown values that are not `Error` objects. No failure-injection command is supplied.
