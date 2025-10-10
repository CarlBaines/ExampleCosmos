import { listProducts } from '../src/app/list-products';
import { createProduct } from '../src/domain/product';
import { FakeProductRepo } from '../src/infra/fake-product-repo';

async function main(): Promise<void> {
  if (process.argv.length !== 3 || process.argv[2] !== 'fake') {
    throw new Error('Usage: npm run demo:list -- fake');
  }

  const productRepo = new FakeProductRepo([
    createProduct({
      id: 'demo-product-1',
      name: 'Example product',
      description: 'A deterministic product for the fake repository demo.',
      pricePence: 1250,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
  ]);

  console.log('Adapter: FakeProductRepo');
  const result = await listProducts({ productRepo });
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'List demo failed');
  process.exitCode = 1;
});
