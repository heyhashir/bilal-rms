export const site = {
  name: "BALY by Bilal Garments EST 2001.",
  tagline: "Crafted since 2001. Worn every day.",
  description:
    "Contemporary ready-to-wear, in-store retail, and tailored essentials for Men, Women, Kids, and Accessories.",
  email: "hello@balibybilalgarments.pk",
  phone: "+92 300 0000000",
  address: "Attock, Punjab, Pakistan",
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

export type CategorySlug = string;

export type SizeChart = {
  label: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
};

export const sizeCharts: Record<string, SizeChart> = {
  apparel: {
    label: "Apparel (cm)",
    columns: [
      { key: "size", label: "Size" },
      { key: "chest", label: "Chest (cm)" },
      { key: "shoulder", label: "Shoulder (cm)" },
      { key: "length", label: "Length (cm)" },
      { key: "sleeve", label: "Sleeve (cm)" },
    ],
    rows: [
      { size: "XS", chest: "86", shoulder: "38", length: "66", sleeve: "60" },
      { size: "S", chest: "92", shoulder: "40", length: "68", sleeve: "61" },
      { size: "M", chest: "98", shoulder: "42", length: "70", sleeve: "62" },
      { size: "L", chest: "104", shoulder: "44", length: "72", sleeve: "63" },
      { size: "XL", chest: "110", shoulder: "46", length: "74", sleeve: "64" },
      { size: "XXL", chest: "116", shoulder: "48", length: "76", sleeve: "65" },
    ],
  },
  bottoms: {
    label: "Jeans and Bottoms (inches)",
    columns: [
      { key: "size", label: "Size" },
      { key: "waist", label: "Waist (in)" },
      { key: "hip", label: "Hip (in)" },
      { key: "inseam", label: "Inseam (in)" },
    ],
    rows: [
      { size: "28", waist: "28", hip: "36", inseam: "30" },
      { size: "30", waist: "30", hip: "38", inseam: "30" },
      { size: "32", waist: "32", hip: "40", inseam: "31" },
      { size: "34", waist: "34", hip: "42", inseam: "31" },
      { size: "36", waist: "36", hip: "44", inseam: "32" },
    ],
  },
  kids: {
    label: "Kids (cm)",
    columns: [
      { key: "size", label: "Size" },
      { key: "chest", label: "Chest (cm)" },
      { key: "length", label: "Length (cm)" },
    ],
    rows: [
      { size: "2-3Y", chest: "55", length: "40" },
      { size: "4-5Y", chest: "60", length: "44" },
      { size: "6-7Y", chest: "65", length: "48" },
      { size: "8-9Y", chest: "70", length: "52" },
      { size: "10-11Y", chest: "76", length: "56" },
    ],
  },
};
