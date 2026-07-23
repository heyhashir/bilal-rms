export type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  postal: string;
  country: string;
  isDefault: boolean;
};

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: "customer" | "admin" | "manager" | "staff";
  addresses: Address[];
  createdAt: number;
};

export type OrderLine = {
  id: string;
  productId: string;
  variantId?: string | null;
  name: string;
  image: string;
  size: string;
  color: string;
  unitPrice: number;
  qty: number;
};

export type Order = {
  id: string;
  internalId: string;
  token: string;
  userId?: string | null;
  email: string;
  customerName: string;
  lines: OrderLine[];
  shipping: {
    address: string;
    address2?: string;
    city: string;
    postal: string;
    phone: string;
    country: string;
    zone: string;
  };
  payment: "cod" | "jazzcash" | "easypaisa";
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: string;
  walletReference: string;
  paymentProof: string;
  createdAt: number;
};
