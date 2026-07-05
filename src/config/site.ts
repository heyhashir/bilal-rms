export const site = {
  name: "Bilal Garments",
  tagline: "Wear bold. Live louder.",
  description:
    "Premium contemporary clothing for Men, Women, Kids, and Accessories.",
  email: "hello@bilalgarments.pk",
  phone: "+92 300 0000000",
  address: "Lahore, Pakistan",
  currency: "PKR",
  currencySymbol: "Rs.",
  social: {
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    tiktok: "https://tiktok.com",
  },
  shipping: {
    flatRate: 250,
    freeAbove: 5000,
  },
};

export const categories = [
  { slug: "men", name: "Men" },
  { slug: "women", name: "Women" },
  { slug: "kids", name: "Kids" },
  { slug: "accessories", name: "Accessories" },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];

export const sizeCharts: Record<string, { label: string; rows: { size: string; chest: string; length: string }[] }> = {
  apparel: {
    label: "Apparel (cm)",
    rows: [
      { size: "XS", chest: "86", length: "66" },
      { size: "S", chest: "92", length: "68" },
      { size: "M", chest: "98", length: "70" },
      { size: "L", chest: "104", length: "72" },
      { size: "XL", chest: "110", length: "74" },
      { size: "XXL", chest: "116", length: "76" },
    ],
  },
  kids: {
    label: "Kids (cm)",
    rows: [
      { size: "2-3Y", chest: "55", length: "40" },
      { size: "4-5Y", chest: "60", length: "44" },
      { size: "6-7Y", chest: "65", length: "48" },
      { size: "8-9Y", chest: "70", length: "52" },
      { size: "10-11Y", chest: "76", length: "56" },
    ],
  },
};
