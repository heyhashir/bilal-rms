import { expect, test } from '@playwright/test';
import { dismissDialogs, loginAsAdmin } from '../helpers';

test.describe('Bilal RMS customer QA', () => {
  test('search, category browsing, size guide, Buy Now, wishlist, and sale visibility work', async ({ page }) => {
    dismissDialogs(page);
    await loginAsAdmin(page);
    const prefix = process.env.QA_RUN_PREFIX?.trim() || `qa-customer-${Date.now()}`;

    const fixture = await page.evaluate(async (qaPrefix) => {
      const categoriesResponse = await fetch('/api/v1/admin/categories', { credentials: 'include' });
      const categoriesPayload = await categoriesResponse.json();
      const categorySlug = categoriesPayload.data.categories[0]?.slug;
      if (!categorySlug) throw new Error('A category is required for customer QA');

      const productName = `${qaPrefix} Searchable Jeans`;
      const productSlug = `${qaPrefix}-searchable-jeans`;
      const response = await fetch('/api/v1/admin/products', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          slug: productSlug,
          name: productName,
          description: 'QA searchable sale jeans with sizing and color options.',
          categorySlug,
          stockMode: 'simple',
          price: 2400,
          salePrice: 1800,
          stock: 10,
          sizeChart: 'bottoms',
          sizes: ['28', '30'],
          colors: [{ name: 'Black', hex: '#111111' }],
          tags: ['qa-keyword', 'denim'],
          featured: true,
          trending: false,
          isActive: true,
          images: [],
          variants: [],
          barcode: `${qaPrefix}-barcode`,
          qrCode: `${qaPrefix}-qr`,
          supplierBarcode: '',
          commissionRate: null,
        }),
      });
      if (!response.ok) throw new Error('Unable to create customer QA product');

      return { productName, productSlug, categorySlug };
    }, prefix);

    await page.goto(`/search?q=${encodeURIComponent(fixture.productName)}`);
    await expect(page.getByRole('link', { name: fixture.productName }).first()).toBeVisible();

    await page.goto('/search?q=qa-no-such-product');
    await expect(page.getByText('No matches for "qa-no-such-product".')).toBeVisible();

    await page.goto(`/category/${fixture.categorySlug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByLabel('Sort category products').selectOption('price-desc');
    await expect(page.getByRole('link', { name: fixture.productName }).first()).toBeVisible();

    await page.goto(`/product/${fixture.productSlug}`);
    await page.getByRole('button', { name: '28', exact: true }).click();
    await page.getByTitle('Black').click();
    await page.getByRole('button', { name: /Size guide/ }).click();
    await expect(page.getByText('Jeans and Bottoms (inches)')).toBeVisible();
    await expect(page.getByText('Inseam (in)')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Buy now' }).click();
    await expect(page.getByRole('heading', { name: 'Checkout.' })).toBeVisible();
    await expect(page.locator('aside').getByText(fixture.productName).last()).toBeVisible();
    await page.getByRole('button', { name: 'Back to cart' }).click();
    await expect(page.getByRole('heading', { name: 'Your bag is empty.' })).toBeVisible();

    await page.goto(`/product/${fixture.productSlug}`);
    await page.getByRole('button', { name: 'Wishlist' }).click();
    await page.goto('/wishlist');
    await expect(page.getByRole('link', { name: fixture.productName }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Move to cart' }).click();
    await page.goto('/cart');
    await expect(page.getByText(fixture.productName).last()).toBeVisible();
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('heading', { name: 'Your bag is empty.' })).toBeVisible();

    const saleResponse = await page.request.get('/api/v1/catalog/products/sale');
    expect(saleResponse.ok()).toBeTruthy();
    const salePayload = await saleResponse.json();
    expect(salePayload.data.products.some((product: { slug: string }) => product.slug === fixture.productSlug)).toBeTruthy();
  });
});
