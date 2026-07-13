import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import prisma from '../config/prisma';
import { bootstrapData } from '../bootstrap/seed';
import { createApp } from '../app';
import { env } from '../config/env';

const prefix = `int-${Date.now().toString(36)}`;

const cleanup = async () => {
  await prisma.inventoryMovement.deleteMany({
    where: {
      OR: [
        { product: { slug: { startsWith: prefix } } },
        { order: { email: { startsWith: prefix } } },
        { posSale: { saleNumber: { startsWith: `POS-${prefix}` } } },
        { posReturn: { sale: { saleNumber: { startsWith: `POS-${prefix}` } } } },
      ],
    },
  });
  await prisma.commissionEntry.deleteMany({
    where: {
      OR: [
        { product: { slug: { startsWith: prefix } } },
        { sale: { saleNumber: { startsWith: `POS-${prefix}` } } },
      ],
    },
  });
  await prisma.posReturn.deleteMany({
    where: {
      sale: { saleNumber: { startsWith: `POS-${prefix}` } },
    },
  });
  await prisma.posPayment.deleteMany({
    where: {
      sale: { saleNumber: { startsWith: `POS-${prefix}` } },
    },
  });
  await prisma.receipt.deleteMany({
    where: {
      sale: { saleNumber: { startsWith: `POS-${prefix}` } },
    },
  });
  await prisma.posSaleItem.deleteMany({
    where: {
      sale: { saleNumber: { startsWith: `POS-${prefix}` } },
    },
  });
  await prisma.posSale.deleteMany({
    where: {
      saleNumber: { startsWith: `POS-${prefix}` },
    },
  });
  await prisma.refundRecord.deleteMany({
    where: {
      returnRequest: {
        order: { email: { startsWith: prefix } },
      },
    },
  });
  await prisma.returnRequest.deleteMany({
    where: {
      order: { email: { startsWith: prefix } },
    },
  });
  await prisma.paymentProof.deleteMany({
    where: {
      order: { email: { startsWith: prefix } },
    },
  });
  await prisma.orderItem.deleteMany({
    where: {
      order: { email: { startsWith: prefix } },
    },
  });
  await prisma.syncJob.deleteMany({
    where: {
      OR: [{ entityId: { startsWith: prefix } }, { device: { deviceKey: { startsWith: prefix } } }],
    },
  });
  await prisma.registerDevice.deleteMany({
    where: { deviceKey: { startsWith: prefix } },
  });
  await prisma.order.deleteMany({
    where: { email: { startsWith: prefix } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: prefix } },
  });
  await prisma.product.deleteMany({
    where: { slug: { startsWith: prefix } },
  });
  await prisma.category.deleteMany({
    where: { slug: { startsWith: prefix } },
  });
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

class CookieJar {
  private cookie = '';

  capture(response: Response) {
    const header = response.headers.get('set-cookie');
    if (!header) {
      return;
    }

    this.cookie = header.split(';', 1)[0] ?? '';
  }

  headers(): Record<string, string> {
    return this.cookie ? { cookie: this.cookie } : {};
  }

  token(): string | null {
    if (!this.cookie) {
      return null;
    }

    const [, value = ''] = this.cookie.split('=', 2);
    return value || null;
  }
}

const createJsonRequest = (baseUrl: string, jar?: CookieJar) =>
  async <T>(pathname: string, init?: RequestInit): Promise<{ status: number; payload: ApiEnvelope<T> | null; response: Response }> => {
    const response = await fetch(`${baseUrl}${pathname}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.method && init.method.toUpperCase() !== 'GET' ? { 'x-requested-with': 'XMLHttpRequest' } : {}),
        ...(jar?.headers() ?? {}),
        ...(init?.headers ?? {}),
      },
    });

    jar?.capture(response);
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    return { status: response.status, payload, response };
  };

const startServer = async (): Promise<{ server: Server; baseUrl: string }> => {
  const app = createApp();

  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}/api/v1`,
      });
    });

    server.once('error', reject);
  });
};

const run = async () => {
  await prisma.$connect();
  await bootstrapData();
  await cleanup();

  const category = await prisma.category.create({
    data: {
      slug: `${prefix}-category`,
      name: `${prefix} Category`,
      description: 'Integration smoke category',
    },
  });

  const product = await prisma.product.create({
    data: {
      slug: `${prefix}-product`,
      name: `${prefix} Product`,
      description: 'Integration smoke product',
      categoryId: category.id,
      price: 1800,
      stock: 6,
      stockMode: 'SIMPLE',
      sizeChart: 'apparel',
    },
  });
  const outOfStockProduct = await prisma.product.create({
    data: {
      slug: `${prefix}-sold-out`,
      name: `${prefix} Sold Out Product`,
      description: 'Out of stock integration product',
      categoryId: category.id,
      price: 999,
      stock: 0,
      stockMode: 'SIMPLE',
      sizeChart: 'apparel',
    },
  });

  const shippingZone = await prisma.shippingZone.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const { server, baseUrl } = await startServer();
  const customerJar = new CookieJar();
  const adminJar = new CookieJar();
  const request = createJsonRequest(baseUrl);
  const customerRequest = createJsonRequest(baseUrl, customerJar);
  const adminRequest = createJsonRequest(baseUrl, adminJar);

  try {
    const missingCsrfHeader = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `${prefix}-blocked@example.com`,
        name: 'Blocked Request',
        password: 'password123',
      }),
    });
    assert.equal(missingCsrfHeader.status, 403, 'state-changing API requests without the app header should be rejected');

    const registration = await customerRequest<{ user: { id: string; email: string; name: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `${prefix}@example.com`,
        name: 'Integration Customer',
        password: 'password123',
      }),
    });

    assert.equal(registration.status, 201, 'customer registration should succeed');
    assert.equal(registration.payload?.data.user.email, `${prefix}@example.com`);

    const me = await customerRequest<{ user: { email: string } | null }>('/auth/me');
    assert.equal(me.status, 200, 'auth/me should succeed for logged-in customer');
    assert.equal(me.payload?.data.user?.email, `${prefix}@example.com`);

    const createdAddress = await customerRequest<{ address: { id: string; city: string; isDefault: boolean } }>('/account/addresses', {
      method: 'POST',
      body: JSON.stringify({
        label: 'Home',
        fullName: 'Integration Customer',
        phone: '03001234567',
        line1: '123 Integration Street',
        line2: '',
        city: shippingZone.city,
        postal: '54000',
        country: 'Pakistan',
        isDefault: true,
      }),
    });

    assert.equal(createdAddress.status, 201, 'address creation should succeed');
    assert.equal(createdAddress.payload?.data.address.city, shippingZone.city);

    const listedAddresses = await customerRequest<{ addresses: Array<{ id: string; isDefault: boolean }> }>('/account/addresses');
    assert.equal(listedAddresses.status, 200, 'address listing should succeed');
    assert.equal(listedAddresses.payload?.data.addresses.length, 1, 'address listing should include the created address');
    assert.equal(listedAddresses.payload?.data.addresses[0]?.isDefault, true, 'default address should be preserved');

    const buildCheckoutForm = (overrides?: {
      email?: string;
      customerName?: string;
      payment?: 'cod' | 'jazzcash' | 'easypaisa';
      walletReference?: string;
      notes?: string;
      qty?: number;
    }) => {
      const form = new FormData();
      form.set('email', overrides?.email ?? `${prefix}@example.com`);
      form.set('customerName', overrides?.customerName ?? 'Integration Customer');
      form.set('phone', '03001234567');
      form.set('address', '123 Integration Street');
      form.set('address2', '');
      form.set('city', shippingZone.city);
      form.set('postal', '54000');
      form.set('country', 'Pakistan');
      form.set('shippingZoneId', shippingZone.id);
      form.set('payment', overrides?.payment ?? 'cod');
      form.set('walletReference', overrides?.walletReference ?? '');
      form.set('notes', overrides?.notes ?? 'Integration order');
      form.set('lines', JSON.stringify([{ productId: product.id, qty: overrides?.qty ?? 1 }]));
      return form;
    };

    const checkoutForm = buildCheckoutForm();

    const checkout = await fetch(`${baseUrl}/orders/checkout`, {
      method: 'POST',
      body: checkoutForm,
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        ...customerJar.headers(),
      },
    });
    customerJar.capture(checkout);
    const checkoutPayload = (await checkout.json()) as ApiEnvelope<{
      order: {
        id: string;
        internalId: string;
        email: string;
        token: string;
        shippingFee: number;
        shipping: {
          zone: string;
        };
      };
    }>;

    assert.equal(checkout.status, 201, 'checkout should succeed');
    assert.equal(checkoutPayload.data.order.email, `${prefix}@example.com`);
    assert.equal(checkoutPayload.data.order.shippingFee, Number(shippingZone.fee), 'checkout should persist the shipping-zone fee');
    assert.equal(checkoutPayload.data.order.shipping.zone, shippingZone.name, 'checkout should persist the shipping-zone name');

    const guestCheckoutForm = buildCheckoutForm({
      email: `${prefix}-guest@example.com`,
      customerName: 'Guest Checkout Customer',
      notes: 'Guest COD integration order',
    });
    const guestCheckout = await fetch(`${baseUrl}/orders/checkout`, {
      method: 'POST',
      body: guestCheckoutForm,
      headers: {
        'x-requested-with': 'XMLHttpRequest',
      },
    });
    const guestCheckoutPayload = (await guestCheckout.json()) as ApiEnvelope<{ order: { email: string; paymentStatus: string } }>;
    assert.equal(guestCheckout.status, 201, 'guest COD checkout should succeed');
    assert.equal(guestCheckoutPayload.data.order.email, `${prefix}-guest@example.com`);
    assert.equal(guestCheckoutPayload.data.order.paymentStatus, 'cod_due');

    const walletCheckoutForm = buildCheckoutForm({
      email: `${prefix}+wallet@example.com`,
      customerName: 'Wallet Checkout Customer',
      payment: 'jazzcash',
      walletReference: 'TXN-VERIFIED',
      notes: 'Wallet proof integration order',
    });
    walletCheckoutForm.set('paymentProof', new Blob(['png-binary-placeholder'], { type: 'image/png' }), 'proof.png');
    const walletCheckout = await fetch(`${baseUrl}/orders/checkout`, {
      method: 'POST',
      body: walletCheckoutForm,
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        ...customerJar.headers(),
      },
    });
    const walletCheckoutPayload = (await walletCheckout.json()) as ApiEnvelope<{ order: { id: string; paymentStatus: string; paymentProof: string } }>;
    assert.equal(walletCheckout.status, 201, 'wallet-proof checkout should succeed');
    assert.equal(walletCheckoutPayload.data.order.paymentStatus, 'proof_uploaded');
    assert.match(walletCheckoutPayload.data.order.paymentProof, /^\/uploads\/payments\//, 'wallet-proof checkout should persist the uploaded proof path');

    const invalidProofForm = buildCheckoutForm({
      payment: 'jazzcash',
      walletReference: 'TXN-123',
      notes: 'Invalid proof attempt',
    });
    invalidProofForm.set('paymentProof', new Blob(['not-an-image'], { type: 'text/plain' }), 'proof.txt');

    const invalidProofResponse = await fetch(`${baseUrl}/orders/checkout`, {
      method: 'POST',
      body: invalidProofForm,
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        ...customerJar.headers(),
      },
    });
    const invalidProofPayload = (await invalidProofResponse.json()) as ApiEnvelope<unknown>;
    assert.equal(invalidProofResponse.status, 400, 'invalid payment proof type should be rejected');
    assert.match(invalidProofPayload.message, /payment screenshots/i, 'invalid payment proof should return a clear validation message');

    const outOfStockForm = buildCheckoutForm({
      notes: 'Out of stock attempt',
    });
    outOfStockForm.set('lines', JSON.stringify([{ productId: outOfStockProduct.id, qty: 1 }]));

    const outOfStockCheckout = await fetch(`${baseUrl}/orders/checkout`, {
      method: 'POST',
      body: outOfStockForm,
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        ...customerJar.headers(),
      },
    });
    const outOfStockPayload = (await outOfStockCheckout.json()) as ApiEnvelope<unknown>;
    assert.equal(outOfStockCheckout.status, 400, 'out-of-stock checkout should be rejected');
    assert.match(outOfStockPayload.message, /insufficient stock/i, 'out-of-stock checkout should return a clear stock message');

    const accountOrders = await customerRequest<{ orders: Array<{ id: string }> }>('/account/orders');
    assert.equal(accountOrders.status, 200, 'account order history should load');
    assert.ok((accountOrders.payload?.data.orders.length ?? 0) >= 2, 'account order history should include the created account orders');
    assert.ok(
      accountOrders.payload?.data.orders.some((order) => order.id === checkoutPayload.data.order.id),
      'account order history should include the COD order',
    );
    assert.ok(
      accountOrders.payload?.data.orders.some((order) => order.id === walletCheckoutPayload.data.order.id),
      'account order history should include the wallet-proof order',
    );

    const trackedOrder = await request<{ order: { id: string } }>('/orders/track', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: checkoutPayload.data.order.id,
        email: `${prefix}@example.com`,
      }),
    });

    assert.equal(trackedOrder.status, 200, 'track-order should find the created order');
    assert.equal(trackedOrder.payload?.data.order.id, checkoutPayload.data.order.id);

    const directOrder = await customerRequest<{ order: { id: string } }>(`/orders/${checkoutPayload.data.order.id}`);
    assert.equal(directOrder.status, 200, 'signed-in customer should access their own order');

    const sessionToken = customerJar.token();
    assert.ok(sessionToken, 'customer session token should be stored after registration');
    await prisma.session.deleteMany({
      where: { token: sessionToken ?? undefined },
    });

    const expiredAccountOrders = await customerRequest<unknown>('/account/orders');
    assert.equal(expiredAccountOrders.status, 401, 'expired sessions should reject protected routes');
    assert.equal(expiredAccountOrders.response.headers.get('x-session-expired'), '1', 'expired sessions should emit the session-expired header');

    const reloginAfterExpiry = await customerRequest<{ user: { email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: `${prefix}@example.com`,
        password: 'password123',
      }),
    });
    assert.equal(reloginAfterExpiry.status, 200, 'customer should be able to log back in after session expiry');

    const createdReturn = await customerRequest<{ request: { id: string; status: string } }>(`/orders/${checkoutPayload.data.order.id}/returns`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Wrong size for walk-in verification',
        details: 'Integration return request',
      }),
    });
    assert.equal(createdReturn.status, 201, 'customer return request should succeed');
    assert.equal(createdReturn.payload?.data.request.status, 'requested');
    const returnRequestId = createdReturn.payload?.data.request.id;
    assert.ok(returnRequestId, 'return request should return an id');

    const logout = await customerRequest<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
    });
    assert.equal(logout.status, 200, 'logout should succeed');

    const postLogoutOrders = await customerRequest<unknown>('/account/orders');
    assert.equal(postLogoutOrders.status, 401, 'protected account routes should reject after logout');

    const adminLogin = await adminRequest<{ user: { email: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      }),
    });

    assert.equal(adminLogin.status, 200, 'admin login should succeed');
    assert.equal(adminLogin.payload?.data.user.email, env.ADMIN_EMAIL);

    const invalidImageForm = new FormData();
    invalidImageForm.set('image', new Blob(['not-an-image'], { type: 'text/plain' }), 'image.txt');
    const invalidImageUpload = await fetch(`${baseUrl}/admin/uploads/product-image`, {
      method: 'POST',
      body: invalidImageForm,
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        ...adminJar.headers(),
      },
    });
    const invalidImagePayload = (await invalidImageUpload.json()) as ApiEnvelope<unknown>;
    assert.equal(invalidImageUpload.status, 400, 'invalid product image type should be rejected');
    assert.match(invalidImagePayload.message, /only jpg|png|webp|gif/i, 'invalid product image should return a clear validation message');

    const adminDashboard = await adminRequest<{ dashboard: { orders: number } }>('/admin/dashboard');
    assert.equal(adminDashboard.status, 200, 'admin dashboard should load');
    assert.ok((adminDashboard.payload?.data.dashboard.orders ?? 0) >= 1, 'dashboard should reflect at least one order');

    const adminBootstrap = await adminRequest<{
      dashboard: { orders: number };
      products: Array<{ id: string }>;
      customers: Array<{ email: string }>;
      returns: Array<{ id: string }>;
    }>('/admin/bootstrap');
    assert.equal(adminBootstrap.status, 200, 'admin bootstrap compatibility endpoint should load');
    assert.ok((adminBootstrap.payload?.data.dashboard.orders ?? 0) >= 1, 'admin bootstrap should include dashboard data');
    assert.ok((adminBootstrap.payload?.data.products.length ?? 0) >= 1, 'admin bootstrap should include products');

    const currentSettings = await adminRequest<{ settings: { name: string; invoicePrefix: string; logoPrimaryText: string; promoRibbonItems: string[] }; shippingZones: Array<{ id: string; city: string }> }>('/admin/settings');
    assert.equal(currentSettings.status, 200, 'admin settings should load');

    const updatedSettings = await adminRequest<{ settings: { name: string; invoicePrefix: string; receiptPrefix: string; logoPrimaryText: string; promoRibbonItems: string[] } }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        name: `Bilal RMS ${prefix}`,
        logoPrimaryText: 'BALI',
        logoSecondaryText: 'By Bilal Garments',
        logoTertiaryText: 'EST 2001',
        promoRibbonText: 'Integration line one\nIntegration line two',
        tagline: 'Integration tagline',
        description: 'Integration settings update',
        email: 'admin@bilalgarments.pk',
        phone: '03001234567',
        address: 'Integration Address',
        currencySymbol: 'Rs.',
        invoicePrefix: `INV-${prefix.slice(-4)}`,
        receiptPrefix: `REC-${prefix.slice(-4)}`,
        thermalHeader: 'Header',
        thermalFooter: 'Footer',
        barcodePrefix: 'BG',
        qrPrefix: 'QR',
        instagram: '',
        facebook: '',
        tiktok: '',
        metaTitle: 'Integration Meta',
        metaDescription: 'Integration meta description',
      }),
    });
    assert.equal(updatedSettings.status, 200, 'admin settings update should succeed');
    assert.equal(updatedSettings.payload?.data.settings.name, `Bilal RMS ${prefix}`);
    assert.equal(updatedSettings.payload?.data.settings.invoicePrefix, `INV-${prefix.slice(-4)}`);
    assert.equal(updatedSettings.payload?.data.settings.logoPrimaryText, 'BALI');
    assert.deepEqual(updatedSettings.payload?.data.settings.promoRibbonItems, ['Integration line one', 'Integration line two']);

    const createdShippingZone = await adminRequest<{ zone: { id: string; city: string; fee: number } }>('/admin/shipping-zones', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Integration Shipping',
        city: `${prefix}-city`,
        fee: 250,
        freeAbove: 5000,
        isActive: true,
      }),
    });
    assert.equal(createdShippingZone.status, 201, 'shipping-zone save should succeed');
    assert.equal(createdShippingZone.payload?.data.zone.city, `${prefix}-city`);
    const shippingZoneId = createdShippingZone.payload?.data.zone.id;
    assert.ok(shippingZoneId, 'shipping-zone save should return an id');

    const employeesBefore = await adminRequest<{ employees: Array<{ id: string }> }>('/admin/employees');
    assert.equal(employeesBefore.status, 200, 'employee list should load');
    const employeeCountBefore = employeesBefore.payload?.data.employees.length ?? 0;

    const savedEmployee = await adminRequest<{ employee: { id: string; status: string; name: string } }>('/admin/employees', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Integration Employee',
        phone: '03005551234',
        commissionRate: 5,
        status: 'active',
        notes: 'Created in integration smoke',
      }),
    });
    assert.equal(savedEmployee.status, 201, 'employee save should succeed');
    assert.equal(savedEmployee.payload?.data.employee.status, 'active');
    const employeeId = savedEmployee.payload?.data.employee.id;
    assert.ok(employeeId, 'employee save should return an id');

    const listedReturns = await adminRequest<{ returns: Array<{ id: string; status: string }> }>('/admin/returns');
    assert.equal(listedReturns.status, 200, 'return list should load');
    assert.ok(listedReturns.payload?.data.returns.some((entry) => entry.id === returnRequestId && entry.status === 'requested'), 'return list should include the customer-created return request');

    const updatedReturn = await adminRequest<{ request: { id: string; status: string; refundAmount: number } }>(`/admin/returns/${returnRequestId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'approved',
        refundAmount: 1800,
        note: 'Approved in integration smoke',
      }),
    });
    assert.equal(updatedReturn.status, 200, 'return status update should succeed');
    assert.equal(updatedReturn.payload?.data.request.status, 'approved');

    const updatedOrderStatus = await adminRequest<{ order: { id: string; paymentStatus: string } }>(`/admin/orders/${checkoutPayload.data.order.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        paymentStatus: 'refunded',
      }),
    });
    assert.equal(updatedOrderStatus.status, 200, 'admin order status update should succeed');
    assert.equal(updatedOrderStatus.payload?.data.order.paymentStatus, 'refunded');

    const verifiedWalletOrder = await adminRequest<{ order: { id: string; paymentStatus: string } }>(`/admin/orders/${walletCheckoutPayload.data.order.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        paymentStatus: 'verified',
      }),
    });
    assert.equal(verifiedWalletOrder.status, 200, 'wallet-proof orders should support payment verification');
    assert.equal(verifiedWalletOrder.payload?.data.order.paymentStatus, 'verified');

    const adjustedInventory = await adminRequest<{ ok: boolean }>('/admin/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({
        productId: product.id,
        delta: 2,
        note: 'Integration stock correction',
      }),
    });
    assert.equal(adjustedInventory.status, 200, 'inventory adjustment should succeed');

    const createdCategory = await adminRequest<{ category: { slug: string } }>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify({
        slug: `${prefix}-admin-category`,
        name: 'Admin Integration Category',
        description: 'Created through admin integration smoke',
      }),
    });
    assert.equal(createdCategory.status, 201, 'admin category save should succeed');
    assert.equal(createdCategory.payload?.data.category.slug, `${prefix}-admin-category`);

    const emptyCategory = await adminRequest<{ category: { slug: string } }>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify({
        slug: `${prefix}-empty-category`,
        name: 'Empty Admin Category',
        description: 'Deleted through admin integration smoke',
      }),
    });
    assert.equal(emptyCategory.status, 201, 'empty admin category create should succeed');

    const createdBrand = await adminRequest<{ brand: { slug: string; status: string } }>('/admin/brands', {
      method: 'POST',
      body: JSON.stringify({
        slug: `${prefix}-admin-brand`,
        name: 'Admin Integration Brand',
        country: 'Pakistan',
        website: '',
        status: 'active',
      }),
    });
    assert.equal(createdBrand.status, 201, 'admin brand save should succeed');
    assert.equal(createdBrand.payload?.data.brand.slug, `${prefix}-admin-brand`);

    const generatedCodes = await adminRequest<{ barcode: string; qrCode: string }>('/admin/barcodes/generate', {
      method: 'POST',
      body: JSON.stringify({
        seed: `${prefix}-seed`,
      }),
    });
    assert.equal(generatedCodes.status, 200, 'barcode generation should succeed');
    assert.match(generatedCodes.payload?.data.barcode ?? '', /^BG-|^[A-Z0-9]+-/i, 'generated barcode should include a prefix');
    assert.ok((generatedCodes.payload?.data.qrCode ?? '').length > 0, 'generated QR code should be returned');

    const createdAdminProduct = await adminRequest<{ product: { id: string; slug: string; stock: number } }>('/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        slug: `${prefix}-admin-product`,
        name: 'Admin Integration Product',
        description: 'Created through admin integration smoke',
        categorySlug: `${prefix}-admin-category`,
        brandSlug: `${prefix}-admin-brand`,
        stockMode: 'simple',
        price: 2250,
        salePrice: null,
        stock: 4,
        sizeChart: 'apparel',
        sizes: [],
        colors: [],
        tags: ['integration'],
        seoTitle: 'Admin Integration Product',
        seoDescription: 'Admin integration description',
        featured: false,
        trending: false,
        isActive: true,
        images: [],
        variants: [],
        barcode: generatedCodes.payload?.data.barcode ?? '',
        qrCode: generatedCodes.payload?.data.qrCode ?? '',
        supplierBarcode: '',
        commissionRate: 2,
      }),
    });
    assert.equal(createdAdminProduct.status, 201, 'admin product create should succeed');
    assert.equal(createdAdminProduct.payload?.data.product.slug, `${prefix}-admin-product`);
    const adminProductId = createdAdminProduct.payload?.data.product.id;
    assert.ok(adminProductId, 'admin product create should return the new product id');

    const updatedAdminProduct = await adminRequest<{ product: { stock: number; salePrice: number | null } }>(`/admin/products/${adminProductId}`, {
      method: 'PUT',
      body: JSON.stringify({
        slug: `${prefix}-admin-product`,
        name: 'Admin Integration Product Updated',
        description: 'Updated through admin integration smoke',
        categorySlug: `${prefix}-admin-category`,
        brandSlug: `${prefix}-admin-brand`,
        stockMode: 'simple',
        price: 2250,
        salePrice: 1999,
        stock: 6,
        sizeChart: 'apparel',
        sizes: [],
        colors: [],
        tags: ['integration', 'updated'],
        seoTitle: 'Admin Integration Product Updated',
        seoDescription: 'Updated admin integration description',
        featured: true,
        trending: false,
        isActive: true,
        images: [],
        variants: [],
        barcode: generatedCodes.payload?.data.barcode ?? '',
        qrCode: generatedCodes.payload?.data.qrCode ?? '',
        supplierBarcode: '',
        commissionRate: 3,
      }),
    });
    assert.equal(updatedAdminProduct.status, 200, 'admin product update should succeed');
    assert.equal(updatedAdminProduct.payload?.data.product.stock, 6);
    assert.equal(updatedAdminProduct.payload?.data.product.salePrice, 1999);

    const createdPosSale = await adminRequest<{ sale: { saleNumber: string; status: string; receipt: { receiptNumber: string } | null; items: Array<{ id: string; employeeId: string; qty: number }> } }>('/admin/pos-sales', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'Walk-in Integration Customer',
        customerPhone: '03001112222',
        saleNumber: `POS-${prefix}`,
        paymentMethod: 'cash',
        paidAmount: 1800,
        status: 'finalized',
        notes: 'Integration POS sale',
        lines: [
          {
            productId: adminProductId,
            employeeId,
            qty: 1,
          },
        ],
      }),
    });
    assert.equal(createdPosSale.status, 201, 'POS sale creation should succeed');
    assert.equal(createdPosSale.payload?.data.sale.status, 'finalized');
    assert.ok(createdPosSale.payload?.data.sale.receipt?.receiptNumber, 'POS sale should create a receipt');
    const posSaleNumber = createdPosSale.payload?.data.sale.saleNumber;
    assert.ok(posSaleNumber, 'POS sale should return a sale number');

    const adminPosSales = await adminRequest<{ sales: Array<{ saleNumber: string; status: string }> }>('/admin/pos-sales');
    assert.equal(adminPosSales.status, 200, 'admin POS sales should load');
    assert.ok(adminPosSales.payload?.data.sales.some((sale) => sale.saleNumber === posSaleNumber), 'admin POS sales should include the created sale');

    const adminPosSaleDetail = await adminRequest<{ sale: { saleNumber: string; payments: Array<{ amount: number }> } }>(`/admin/pos-sales/${posSaleNumber}`);
    assert.equal(adminPosSaleDetail.status, 200, 'admin POS sale detail should load');
    assert.equal(adminPosSaleDetail.payload?.data.sale.saleNumber, posSaleNumber);

    const reprintedPosSale = await adminRequest<{ sale: { receipt: { reprintCount: number } | null } }>(`/admin/pos-sales/${posSaleNumber}/reprint`, {
      method: 'POST',
    });
    assert.equal(reprintedPosSale.status, 200, 'receipt reprint tracking should succeed');
    assert.equal(reprintedPosSale.payload?.data.sale.receipt?.reprintCount, 1, 'receipt reprint should increment the receipt counter');

    const listedCommissions = await adminRequest<{ commissions: Array<{ id: string; saleNumber: string; status: string }> }>('/admin/commissions');
    assert.equal(listedCommissions.status, 200, 'commission list should load');
    const earnedCommission = listedCommissions.payload?.data.commissions.find((entry) => entry.saleNumber === posSaleNumber && entry.status === 'earned');
    assert.ok(earnedCommission, 'POS sale should create an earned commission entry');

    const updatedCommission = await adminRequest<{ commission: { id: string; status: string } }>(`/admin/commissions/${earnedCommission?.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'paid',
        note: 'Paid in integration smoke',
      }),
    });
    assert.equal(updatedCommission.status, 200, 'commission status update should succeed');
    assert.equal(updatedCommission.payload?.data.commission.status, 'paid');

    const refundedPosSale = await adminRequest<{ sale: { saleNumber: string; status: string } }>(`/admin/pos-sales/${posSaleNumber}/refunds`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Integration refund',
        note: 'Refunded in integration smoke',
        items: [
          {
            saleItemId: createdPosSale.payload?.data.sale.items[0]?.id ?? '',
            qty: 1,
          },
        ],
      }),
    });
    assert.equal(refundedPosSale.status, 200, 'POS refund should succeed');

    const commissionsAfterRefund = await adminRequest<{ commissions: Array<{ saleNumber: string; status: string }> }>('/admin/commissions');
    assert.equal(commissionsAfterRefund.status, 200, 'commission list should reload after refund');
    assert.ok(
      commissionsAfterRefund.payload?.data.commissions.some((entry) => entry.saleNumber === posSaleNumber && entry.status === 'reversed'),
      'POS refund should create a reversed commission entry',
    );

    const archivedAdminProduct = await adminRequest<{ ok: boolean }>(`/admin/products/${adminProductId}`, {
      method: 'DELETE',
    });
    assert.equal(archivedAdminProduct.status, 200, 'admin product archive should succeed');

    const archivedEmployee = await adminRequest<{ ok: boolean }>(`/admin/employees/${employeeId}`, {
      method: 'DELETE',
    });
    assert.equal(archivedEmployee.status, 200, 'employee archive should succeed');

    const employeesAfter = await adminRequest<{ employees: Array<{ id: string; status: string }> }>('/admin/employees');
    assert.equal(employeesAfter.status, 200, 'employee list should reload after save and archive');
    assert.ok((employeesAfter.payload?.data.employees.length ?? 0) >= employeeCountBefore + 1, 'employee list should include the created employee record');
    const archivedEmployeeRow = employeesAfter.payload?.data.employees.find((employee) => employee.id === employeeId);
    assert.equal(archivedEmployeeRow?.status, 'inactive', 'employee archive should persist inactive status');

    const archivedBrand = await adminRequest<{ ok: boolean }>(`/admin/brands/${prefix}-admin-brand`, {
      method: 'DELETE',
    });
    assert.equal(archivedBrand.status, 200, 'admin brand archive should succeed');

    const blockedCategoryDelete = await adminRequest<unknown>(`/admin/categories/${prefix}-admin-category`, {
      method: 'DELETE',
    });
    assert.equal(blockedCategoryDelete.status, 400, 'category delete should be blocked while any products still reference it');

    const deletedEmptyCategory = await adminRequest<{ ok: boolean }>(`/admin/categories/${prefix}-empty-category`, {
      method: 'DELETE',
    });
    assert.equal(deletedEmptyCategory.status, 200, 'empty category delete should succeed');

    const inventorySnapshot = await adminRequest<{ products: Array<{ id: string; stock: number }> }>('/admin/inventory/snapshot');
    assert.equal(inventorySnapshot.status, 200, 'inventory snapshot should load');
    const snapshotProduct = inventorySnapshot.payload?.data.products.find((entry) => entry.id === product.id);
    assert.ok(snapshotProduct, 'inventory snapshot should include the seeded product');
    assert.equal(snapshotProduct?.stock, 6, 'inventory snapshot should reflect guest, wallet, return, and manual adjustment changes');

    const inventoryLedger = await adminRequest<{ movements: Array<{ productId: string; reason: string }> }>('/admin/inventory/ledger?limit=20');
    assert.equal(inventoryLedger.status, 200, 'inventory ledger should load');
    assert.ok(
      inventoryLedger.payload?.data.movements.some((entry) => entry.productId === product.id && entry.reason === 'order'),
      'inventory ledger should include the checkout movement',
    );
    assert.ok(
      inventoryLedger.payload?.data.movements.some((entry) => entry.productId === product.id && entry.reason === 'adjustment'),
      'inventory ledger should include the manual adjustment movement',
    );
    assert.ok(
      inventoryLedger.payload?.data.movements.some((entry) => entry.reason === 'pos_sale'),
      'inventory ledger should include the POS sale movement',
    );
    assert.ok(
      inventoryLedger.payload?.data.movements.some((entry) => entry.reason === 'pos_refund'),
      'inventory ledger should include the POS refund movement',
    );

    const adminOrders = await adminRequest<{ orders: Array<{ id: string; status: string }> }>('/admin/orders');
    assert.equal(adminOrders.status, 200, 'admin orders should load');
    const returnedOrder = adminOrders.payload?.data.orders.find((order) => order.id === checkoutPayload.data.order.id);
    assert.ok(returnedOrder, 'admin orders should include the created order');
    assert.equal(returnedOrder?.status, 'returned', 'approved returns should update the related order status');

    const adminCustomers = await adminRequest<{ customers: Array<{ email: string; orderCount: number; totalSpend: number }> }>('/admin/customers');
    assert.equal(adminCustomers.status, 200, 'admin customers should load');
    const createdCustomer = adminCustomers.payload?.data.customers.find((entry) => entry.email === `${prefix}@example.com`);
    assert.ok(createdCustomer, 'admin customers should include the created customer');
    assert.equal(createdCustomer?.orderCount, 2, 'admin customers should include computed order counts');
    assert.ok((createdCustomer?.totalSpend ?? 0) > 0, 'admin customers should include computed spend');

    const syncRegister = await request<{ device: { deviceKey: string } }>('/sync/register', {
      method: 'POST',
      body: JSON.stringify({
        deviceKey: `${prefix}-device`,
        name: 'Integration POS',
        notes: 'Integration test device',
      }),
    });
    assert.equal(syncRegister.status, 201, 'sync device registration should succeed');

    const syncBootstrap = await request<{ settings: { name: string }; employees: Array<{ id: string }>; products: Array<{ id: string }>; cursor: string; changed: boolean }>('/sync/bootstrap?deviceKey=' + encodeURIComponent(`${prefix}-device`));
    assert.equal(syncBootstrap.status, 200, 'sync bootstrap should succeed');
    assert.equal(syncBootstrap.payload?.data.settings.name, `Bilal RMS ${prefix}`);
    assert.ok((syncBootstrap.payload?.data.products.length ?? 0) >= 1, 'sync bootstrap should include products');
    assert.ok(syncBootstrap.payload?.data.cursor, 'sync bootstrap should return a durable cursor');
    assert.equal(syncBootstrap.payload?.data.changed, true, 'initial sync bootstrap should be treated as changed');

    const syncPush = await request<{ count: number }>('/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        deviceKey: `${prefix}-device`,
        cursor: syncBootstrap.payload?.data.cursor,
        jobs: [
          {
            jobKey: `${prefix}-job-key`,
            direction: 'push',
            entityType: 'pos-sale',
            entityId: `${prefix}-job`,
            payload: { saleNumber: 'integration' },
            status: 'failed',
            error: 'Network timeout',
          },
        ],
      }),
    });
    assert.equal(syncPush.status, 201, 'sync push should succeed');
    assert.equal(syncPush.payload?.data.count, 1, 'first sync push should record one job');

    const duplicateSyncPush = await request<{ count: number }>('/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        deviceKey: `${prefix}-device`,
        cursor: syncBootstrap.payload?.data.cursor,
        jobs: [
          {
            jobKey: `${prefix}-job-key`,
            direction: 'push',
            entityType: 'pos-sale',
            entityId: `${prefix}-job`,
            payload: { saleNumber: 'integration' },
            status: 'failed',
            error: 'Network timeout',
          },
        ],
      }),
    });
    assert.equal(duplicateSyncPush.status, 201, 'duplicate sync push should still succeed');
    assert.equal(duplicateSyncPush.payload?.data.count, 0, 'duplicate sync push should not create a second job');

    const syncDiagnostics = await adminRequest<{
      summary: { failedJobs: number };
      devices: Array<{ deviceKey: string; lastCursor: string | null }>;
      jobs: Array<{ entityId: string | null; status: string }>;
    }>('/admin/sync-diagnostics');
    assert.equal(syncDiagnostics.status, 200, 'admin sync diagnostics should load');
    assert.ok((syncDiagnostics.payload?.data.summary.failedJobs ?? 0) >= 1, 'sync diagnostics should include failed jobs');
    assert.ok(
      syncDiagnostics.payload?.data.jobs.some((job) => job.entityId === `${prefix}-job` && job.status === 'failed'),
      'sync diagnostics should include the pushed failed job',
    );
    assert.ok(
      syncDiagnostics.payload?.data.devices.some((device) => device.deviceKey === `${prefix}-device` && device.lastCursor === syncBootstrap.payload?.data.cursor),
      'sync diagnostics should expose the persisted device cursor',
    );

    const deletedShippingZone = await adminRequest<{ ok: boolean }>(`/admin/shipping-zones/${shippingZoneId}`, {
      method: 'DELETE',
    });
    assert.equal(deletedShippingZone.status, 200, 'shipping-zone delete should succeed');

    const orderExport = await adminRequest<never>('/admin/orders/export');
    assert.equal(orderExport.status, 200, 'order export should succeed');
    assert.match(orderExport.response.headers.get('content-type') ?? '', /text\/csv/i, 'order export should return CSV');

    const customerExport = await adminRequest<never>('/admin/customers/export');
    assert.equal(customerExport.status, 200, 'customer export should succeed');
    assert.match(customerExport.response.headers.get('content-type') ?? '', /text\/csv/i, 'customer export should return CSV');

    const posExport = await adminRequest<never>('/admin/pos-sales/export');
    assert.equal(posExport.status, 200, 'POS export should succeed');
    assert.match(posExport.response.headers.get('content-type') ?? '', /text\/csv/i, 'POS export should return CSV');

    const commissionExport = await adminRequest<never>('/admin/commissions/export');
    assert.equal(commissionExport.status, 200, 'commission export should succeed');
    assert.match(commissionExport.response.headers.get('content-type') ?? '', /text\/csv/i, 'commission export should return CSV');

    const inventoryExport = await adminRequest<never>('/admin/inventory/ledger/export');
    assert.equal(inventoryExport.status, 200, 'inventory ledger export should succeed');
    assert.match(inventoryExport.response.headers.get('content-type') ?? '', /text\/csv/i, 'inventory export should return CSV');

    console.log('Backend integration smoke passed');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
};

void run()
  .catch((error) => {
    console.error('Backend integration smoke failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch(() => undefined);
    await prisma.$disconnect();
  });
