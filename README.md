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

`npm ci` restores [the lockfile](package-lock.json); a successful build exits without compiler errors. Historical scaffold note: before the domain files were added, the setup checkpoint had no TypeScript inputs, so its build reports TS18003 (no inputs). That checkpoint is for setup/inspection; the domain checkpoint supplies the first compilable source. Keep the lockfile intact if restoration fails and report the Node/npm versions and error. Do not substitute an unlocked installation as proof that the documented restore works.

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

## Cosmos adapter

[CosmosProductRepo](src/infra/cosmos-product-repo.ts) is the second port implementation. Its required options are `endpoint`, `databaseId`, `containerId` and `key`, each a non-blank string. It constructs its own Cosmos client and supports account-key authentication.

The storage DTO uses an ISO string for `updatedAt`; the domain uses `Date`. Document-to-domain mapping calls `createProduct`, so stored records must satisfy the domain rules too. Invalid records can cause a read or list to fail. Whole-item upserts convert dates back to ISO strings.

This example uses partition key **`/id`**. Point reads and deletes therefore pass both the item ID and the matching partition value with `item(id, id)`. Other partition designs require their actual partition value. Missing items become `null` on read or a no-op on delete; other failures reject. Listing uses `readAll().fetchAll()`, loading the full result into memory for a small dataset.

The composition root and Cosmos demo below wire this adapter into the same use case as the fake.

## Cloud setup and Cosmos demo

[composition-root.ts](src/config/composition-root.ts) connects the concrete Cosmos repository to the use case. It lazily creates and reuses a repository, validates `COSMOS_KEY` when construction is requested, and supplies the use-case dependencies. Caching reuses connections; it does not make business data durable by itself.

For Week 4, the account endpoint, database and container stay as explicit non-secret constants in that file; only the key comes from the environment. Replace the demonstration target with your own provisioned target. Moving all settings into environment configuration is a later teaching step.

### Select an account, subscription and permitted region

Azure CLI **2.91.0** was inspected; its core commands below work without a Cosmos CLI extension installed. Check the commands in your environment before provisioning. Auth0 CLI **1.37.0** is present in the recorded image baseline but is not used by this example.

```sh
az version
az cosmosdb create --help
az cosmosdb sql database create --help
az cosmosdb sql container create --help
az login
az account list --query "[].{name:name,id:id,isDefault:isDefault}" --output table
SUBSCRIPTION_ID='<your-subscription-id>'
az account set --subscription "$SUBSCRIPTION_ID"
az account show --query '{name:name,id:id}' --output table
az account list-locations --query '[].{name:name,displayName:displayName}' --output table
az provider show --namespace Microsoft.DocumentDB \
  --query '{registrationState:registrationState,regions:resourceTypes[?resourceType==`databaseAccounts`].locations}' --output json
az policy assignment list --scope "/subscriptions/$SUBSCRIPTION_ID" \
  --disable-scope-strict-match true --output json
```

Review allowed-location policy parameters and definitions, including inherited policies or initiatives, with your tutor if necessary. A region appearing in `list-locations` is not proof that your subscription permits Cosmos there. The provider must be registered; ask the subscription administrator if registration or policy inspection is unavailable. See the [account CLI reference](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest) and [policy assignment reference](https://learn.microsoft.com/en-us/cli/azure/policy/assignment?view=azure-cli-latest).

The commands below choose **UK South (`uksouth`)**, subject to those checks. If it is not permitted or serverless is unavailable, agree a supported region before proceeding and use it consistently. This README does not establish your subscription's entitlement or capacity.

### Provision or reuse the demonstration target

For the Week 4 labs, use a dedicated disposable demonstration resource group containing only your own Week 4 resources. You may reuse your own existing Week 4 demonstration target after verifying its configuration. Do not use an assessment target or a shared resource group. Follow the course naming convention `project-env-uid-type`. Replace `YOUR_UID` below with a short identifier made from lowercase letters and digits. The full Cosmos account name must be globally unique and contain 3–44 lowercase letters, digits or hyphens. Use the permitted region established in the preceding checks consistently.

```sh
RESOURCE_GROUP='week4-lab-YOUR_UID-rg'
COSMOS_ACCOUNT='week4-lab-YOUR_UID-cosmos'
REGION='uksouth'
DATABASE_ID='catalogue-db'
CONTAINER_ID='products'
```

These are resource-creating commands and incur charges. Serverless bills consumed request units and retained storage; keeping data is not free merely because the application is idle. Do not specify provisioned throughput for this serverless route. Microsoft's [serverless CLI sample](https://github.com/Azure-Samples/azure-cli-samples/blob/master/cosmosdb/sql/serverless.sh) and [serverless overview](https://learn.microsoft.com/en-us/azure/cosmos-db/serverless) explain the capability and charging model. The CLI retains `sql` in command names for the API now called NoSQL.

```sh
az group create --name "$RESOURCE_GROUP" --location "$REGION" --output none
az cosmosdb create --resource-group "$RESOURCE_GROUP" --name "$COSMOS_ACCOUNT" \
  --kind GlobalDocumentDB --locations regionName="$REGION" failoverPriority=0 isZoneRedundant=False \
  --capabilities EnableServerless --default-consistency-level Session --output none
az cosmosdb sql database create --resource-group "$RESOURCE_GROUP" \
  --account-name "$COSMOS_ACCOUNT" --name "$DATABASE_ID" --output none
az cosmosdb sql container create --resource-group "$RESOURCE_GROUP" \
  --account-name "$COSMOS_ACCOUNT" --database-name "$DATABASE_ID" \
  --name "$CONTAINER_ID" --partition-key-path '/id' --output none
```

Check the account's capability, key-auth policy and location, plus the container partition path:

```sh
az cosmosdb show --resource-group "$RESOURCE_GROUP" --name "$COSMOS_ACCOUNT" \
  --query '{endpoint:documentEndpoint,capabilities:capabilities[].name,locations:locations[].locationName,keyAuthDisabled:disableLocalAuth}' --output json
az cosmosdb sql container show --resource-group "$RESOURCE_GROUP" \
  --account-name "$COSMOS_ACCOUNT" --database-name "$DATABASE_ID" \
  --name "$CONTAINER_ID" --query '{id:resource.id,partitionKey:resource.partitionKey.paths}' --output json
```

Confirm `EnableServerless`, your chosen location, key authentication not disabled, and `/id`. Stop and resolve a mismatch rather than attempting a destructive reset. An existing provisioned-throughput account is not made serverless by creating a container. See the [account CLI reference](https://learn.microsoft.com/en-us/cli/azure/cosmosdb?view=azure-cli-latest) and [container reference](https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container?view=azure-cli-latest).

### Configure the code and export the key

Copy the inspected account endpoint into `COSMOS_OPTIONS.endpoint` in [composition-root.ts](src/config/composition-root.ts), and set `databaseId` and `containerId` to match the variables above. Shell variables for these names do not configure the application: the application reads the constants.

In the same terminal you will use for the application commands, retrieve and export the key without displaying it:

```sh
COSMOS_KEY="$(az cosmosdb keys list --resource-group "$RESOURCE_GROUP" \
  --name "$COSMOS_ACCOUNT" --type keys --query primaryMasterKey --output tsv)"
export COSMOS_KEY
```

Do not print the key, enable shell tracing during retrieval, or put it in source or Git. Your signed-in Azure identity needs permission to retrieve account keys. Keep shell variables aligned with the account in the code. Repeat the export after opening a new terminal or reopening the container; a host already running must be restarted to inherit changes.

```sh
npm run demo:list -- cosmos
```

Expect `Adapter: CosmosProductRepo`, then a success result with a `data` array; a new empty container yields `[]`. Missing/blank keys fail explicitly, and configuration or repository failures exit non-zero. Invalid modes print usage and fail. The fake command remains available without Azure configuration and does not load Cosmos composition. Both modes invoke the same use case, but cloud data may differ or contain additional records; do not assume identical ordering or contents.

## Seed deterministic sample data

With the target constants and same-terminal key configured, run:

```sh
npm run seed
npm run demo:list -- cosmos
```

[The seed runner](scripts/seed-product-repo.ts) builds first, prints only the account endpoint/database/container as its target summary, and sequentially upserts the Products from [test-products.ts](scripts/test-products.ts). The fixtures call `createProduct`, so domain validation runs before seeding. The supplied names remain valid after the student adds the 100-character limit.

Expect progress for `widget-001`, `widget-002` and `widget-003`, followed by `Completed seeding products.` Inspect those IDs in Azure portal **Data Explorer**, under your database/container's **Items**, and compare them with the Cosmos demo output. Run the demo again in a fresh process to observe persisted data.

Reruns replace those three sample IDs while retaining unrelated records. Writes are sequential and not transactional: earlier writes may remain if a later one fails. Configuration or write failure exits non-zero; the completion message appears only after all writes succeed. There is no wipe/reset operation or interactive confirmation.

The seed path and Cosmos read mapper both invoke the factory. Ordinary seeding or listing does not exercise the name-length boundary; use `demo:domain` for that exercise.
