import { randomUUID } from 'crypto';
import path from 'path';
import prisma from '../config/prisma';
import { ApiError } from '../types/ApiError';
import { inventoryService } from './inventory.service';
import { orderRepository } from '../repositories/order.repository';

type CheckoutInput = {
  email: string;
  customerName: string;
  phone: string;
  address: string;
  address2?: string;
  city: string;
  postal: string;
  country: string;
  shippingZoneId: string;
  payment: 'cod' | 'jazzcash' | 'easypaisa';
  walletReference?: string;
  notes?: string;
  lines: Array<{
    productId: string;
    variantId?: string | null;
    qty: number;
  }>;
};

export const orderService = {
  listAdminOrders(params?: {
    page: number;
    pageSize: number;
    query?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }) {
    return orderRepository.findAdminOrders(params);
  },
  listAdminReturns() {
    return orderRepository.findAdminReturns();
  },
  updateStatuses(orderNumber: string, data: { orderStatus?: string; paymentStatus?: string }) {
    return orderRepository.updateStatuses(orderNumber, {
      orderStatus: data.orderStatus?.toUpperCase(),
      paymentStatus: data.paymentStatus?.toUpperCase(),
    });
  },
  async checkout(params: {
    input: CheckoutInput;
    userId?: string | null;
    paymentProof?: {
      path: string;
      originalname: string;
      mimetype: string;
      size: number;
    } | null;
  }) {
    const { input, userId, paymentProof } = params;
    const shippingZone = await orderRepository.findShippingZoneById(input.shippingZoneId);

    const productIds = input.lines.map((line) => line.productId);
    const products = await orderRepository.findCheckoutProductsByIds(productIds);

    const productMap = new Map(products.map((product) => [product.id, product]));
    const subtotal = input.lines.reduce((sum, line) => {
      const product = productMap.get(line.productId);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      const variant = line.variantId ? product.variants.find((entry) => entry.id === line.variantId) : null;
      const stock = variant ? variant.stock : product.stock;
      if (stock < line.qty) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      const unitPrice = Number(variant?.priceOverride ?? product.salePrice ?? product.price);
      return sum + unitPrice * line.qty;
    }, 0);

    const shippingFee =
      shippingZone.freeAbove !== null && subtotal >= Number(shippingZone.freeAbove)
        ? 0
        : Number(shippingZone.fee);

    const orderNumber = `BG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const publicToken = randomUUID();

    return prisma.$transaction(async (tx) => {
      const createdOrder = await orderRepository.createOrder(tx, {
        orderNumber,
        publicToken,
        userId: userId ?? null,
        customerName: input.customerName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        addressLine1: input.address,
        addressLine2: input.address2 || null,
        city: input.city,
        postalCode: input.postal,
        country: input.country,
        paymentMethod: input.payment.toUpperCase() as 'COD' | 'JAZZCASH' | 'EASYPAISA',
        paymentStatus: input.payment === 'cod' ? 'COD_DUE' : paymentProof ? 'PROOF_UPLOADED' : 'PENDING',
        shippingZoneId: shippingZone.id,
        shippingZoneName: shippingZone.name,
        shippingFee,
        subtotal,
        total: subtotal + shippingFee,
        walletReference: input.walletReference || null,
        notes: input.notes || null,
      });

      for (const line of input.lines) {
        const product = productMap.get(line.productId)!;
        const variant = line.variantId ? product.variants.find((entry) => entry.id === line.variantId) : null;
        const unitPrice = Number(variant?.priceOverride ?? product.salePrice ?? product.price);

        await orderRepository.createOrderItem(tx, {
          orderId: createdOrder.id,
          productId: product.id,
          variantId: variant?.id ?? null,
          name: product.name,
          slug: product.slug,
          imagePath: product.images[0]?.path ?? '',
          size: variant?.size ?? '',
          colorName: variant?.colorName ?? '',
          unitPrice,
          qty: line.qty,
        });

        await inventoryService.recordOrderSale(tx, {
          productId: product.id,
          variantId: variant?.id ?? null,
          qty: line.qty,
          orderId: createdOrder.id,
          reference: createdOrder.orderNumber,
        });
      }

      if (paymentProof) {
        await orderRepository.createPaymentProof(tx, {
          orderId: createdOrder.id,
          filePath: `/uploads/payments/${path.basename(paymentProof.path)}`,
          originalName: paymentProof.originalname,
          mimeType: paymentProof.mimetype,
          size: paymentProof.size,
        });
      }

      return orderRepository.findOrderById(tx, createdOrder.id);
    });
  },
  async getOrder(orderNumber: string) {
    return orderRepository.findByOrderNumber(orderNumber);
  },
  async trackOrder(orderNumber: string, email: string) {
    return orderRepository.findTrackedOrder(orderNumber, email);
  },
  async createReturn(params: {
    orderNumber: string;
    userId?: string | null;
    reason: string;
    details?: string;
  }) {
    const order = await orderRepository.findOrderForReturn(params.orderNumber);

    const request = await orderRepository.createReturnRequest({
      orderId: order.id,
      userId: params.userId ?? null,
      reason: params.reason,
      details: params.details || '',
    });

    await orderRepository.updateOrderStatusById(prisma, order.id, 'RETURN_REQUESTED');

    return { order, request };
  },
  async updateReturnStatus(params: {
    returnRequestId: string;
    status: 'requested' | 'approved' | 'rejected' | 'refunded';
    refundAmount?: number | null;
    note?: string;
  }) {
    return prisma.$transaction(
      async (tx) => {
        const request = await orderRepository.findReturnRequestWithOrderItems(tx, params.returnRequestId);

        const nextStatus = params.status.toUpperCase() as 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
        const shouldRestock =
          (nextStatus === 'APPROVED' || nextStatus === 'REFUNDED') &&
          request.status !== 'APPROVED' &&
          request.status !== 'REFUNDED';

        const updatedRequest = await orderRepository.updateReturnRequest(tx, request.id, {
          status: nextStatus,
          refundAmount: params.refundAmount ?? null,
          note: params.note || '',
        });

        if (shouldRestock) {
          for (const item of request.order.items) {
            await inventoryService.recordOrderReturn(tx, {
              productId: item.productId,
              variantId: item.variantId ?? null,
              qty: item.qty,
              orderId: request.order.id,
              reference: request.order.orderNumber,
              note: `Return ${request.id}`,
            });
          }

          await orderRepository.updateOrderStatusById(tx, request.order.id, 'RETURNED');
        } else if (nextStatus === 'REJECTED') {
          await orderRepository.updateOrderStatusById(tx, request.order.id, 'DELIVERED');
        }

        if (nextStatus === 'REFUNDED' && params.refundAmount) {
          await orderRepository.upsertRefundRecord(tx, updatedRequest.id, {
            amount: params.refundAmount,
            note: params.note || '',
          });
        }

        return updatedRequest;
      },
      {
        timeout: 15_000,
      },
    );
  },
};
