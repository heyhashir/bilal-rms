import { randomBytes } from 'node:crypto';
import { Prisma, StoreSetting } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../types/ApiError';

type DbClient = Prisma.TransactionClient | typeof prisma;

const INVOICE_SEQUENCE_ID = 'POS_INVOICE';
const NUMBERS_PER_LETTER = 999_999;

const sequenceLetters = (zeroBasedIndex: number): string => {
  let value = zeroBasedIndex + 1;
  let result = '';

  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }

  return result;
};

export const formatInvoiceNumber = (sequence: number): string => {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new ApiError(500, 'Invalid invoice sequence');
  }

  const prefixIndex = Math.floor((sequence - 1) / NUMBERS_PER_LETTER);
  const numericPart = ((sequence - 1) % NUMBERS_PER_LETTER) + 1;
  return `${sequenceLetters(prefixIndex)}${numericPart.toString().padStart(6, '0')}`;
};

const makeReceiptId = (prefix: string): string => {
  const safePrefix = prefix.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6) || 'REC';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `${safePrefix}-${timestamp}-${random}`;
};

export const buildReceiptSnapshot = (settings: StoreSetting): Prisma.InputJsonObject => ({
  version: 1,
  store: {
    name: settings.storeName,
    logoPrimaryText: settings.logoPrimaryText,
    logoSecondaryText: settings.logoSecondaryText,
    logoTertiaryText: settings.logoTertiaryText,
    logoPath: settings.receiptLogoPath ?? '',
    address: settings.address,
    phone: settings.phone,
    taxNumber: settings.taxNumber ?? '',
    currencyCode: settings.currencyCode,
    currencySymbol: settings.currencySymbol,
  },
  receipt: {
    header: settings.thermalHeader,
    footer: settings.thermalFooter,
    thankYou: settings.receiptThankYou,
    guaranteePolicy: settings.guaranteePolicy,
    exchangePolicy: settings.exchangePolicy,
    returnPolicy: settings.returnPolicy,
    saleItemPolicy: settings.saleItemPolicy,
    notes: settings.receiptNotes,
  },
});

export const receiptService = {
  async allocateDocumentNumbers(db: DbClient, settings: StoreSetting) {
    const counter = await db.documentSequence.upsert({
      where: { id: INVOICE_SEQUENCE_ID },
      create: {
        id: INVOICE_SEQUENCE_ID,
        nextValue: 2,
      },
      update: {
        nextValue: { increment: 1 },
      },
    });
    const invoiceSequence = counter.nextValue - 1;

    return {
      invoiceSequence,
      invoiceNumber: formatInvoiceNumber(invoiceSequence),
      receiptNumber: makeReceiptId(settings.receiptPrefix),
      documentSnapshot: buildReceiptSnapshot(settings),
    };
  },
};
