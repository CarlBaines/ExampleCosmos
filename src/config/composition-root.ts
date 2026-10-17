// The composition root connects concrete infrastructure adapters to application
// use cases, keeping configuration and construction out of business logic.
import { ListProductsDeps } from '../app/list-products';
import { ProductRepo } from '../domain/product-repo';
import { CosmosProductRepo } from '../infra/cosmos-product-repo';

// Week 4 demonstration target: replace these values with your provisioned
// Cosmos account endpoint, database and container names. The container uses /id.
const COSMOS_OPTIONS = {
  endpoint: 'https://shopping-dev-ab47-cosmos-uksouth.documents.azure.com:443/',
  databaseId: 'catalogue-db',
  containerId: 'products',
};

let cachedProductRepo: ProductRepo | null = null;

export const getProductRepo = (): ProductRepo => {
  if (!cachedProductRepo) {
    const key = process.env.COSMOS_KEY;
    if (!key || key.trim() === '') {
      throw new Error('COSMOS_KEY must be set to a non-empty Cosmos DB account key.');
    }

    cachedProductRepo = new CosmosProductRepo({ ...COSMOS_OPTIONS, key });
  }
  return cachedProductRepo;
};

export const createListProductsDeps = (): ListProductsDeps => ({
  productRepo: getProductRepo(),
});
