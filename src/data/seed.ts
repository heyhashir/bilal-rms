import type { CategorySlug } from "@/config/site";
import tee from "@/assets/p-tee.jpg";
import jacket from "@/assets/p-jacket.jpg";
import pants from "@/assets/p-pants.jpg";
import sweater from "@/assets/p-sweater.jpg";
import bag from "@/assets/p-bag.jpg";
import catKids from "@/assets/cat-kids.jpg";
import catWomen from "@/assets/cat-women.jpg";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CategorySlug;
  price: number;
  salePrice?: number;
  images: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  stock: number;
  sizeChart: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  trending?: boolean;
  featured?: boolean;
  createdAt: number;
};

const desc = (s: string) =>
  `${s} Crafted from premium fabric with a relaxed, modern silhouette. Designed in Lahore, made to last.`;

export const seedProducts: Product[] = [
  {
    id: "p1",
    slug: "essential-black-tee",
    name: "Essential Black Tee",
    description: desc("A wardrobe staple with a heavyweight cotton hand-feel."),
    category: "men",
    price: 2490,
    salePrice: 1990,
    images: [tee, jacket, sweater],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Ivory", hex: "#f5f1e6" },
      { name: "Olive", hex: "#5d6b3d" },
    ],
    stock: 24,
    sizeChart: "apparel",
    tags: ["#basics", "#tee", "#unisex"],
    trending: true,
    featured: true,
    createdAt: Date.now() - 1000,
  },
  {
    id: "p2",
    slug: "sand-utility-jacket",
    name: "Sand Utility Jacket",
    description: desc("Structured cotton-twill jacket with double chest pockets."),
    category: "men",
    price: 8990,
    images: [jacket, pants, tee],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Sand", hex: "#c9b692" },
      { name: "Black", hex: "#111111" },
    ],
    stock: 9,
    sizeChart: "apparel",
    tags: ["#outerwear", "#aw26"],
    featured: true,
    trending: true,
    createdAt: Date.now() - 2000,
  },
  {
    id: "p3",
    slug: "olive-cargo-pant",
    name: "Olive Cargo Pant",
    description: desc("Wide-leg cargo with reinforced stitching."),
    category: "men",
    price: 5490,
    salePrice: 3990,
    images: [pants, jacket],
    sizes: ["28", "30", "32", "34", "36"],
    colors: [
      { name: "Olive", hex: "#5d6b3d" },
      { name: "Stone", hex: "#a89c87" },
    ],
    stock: 15,
    sizeChart: "apparel",
    tags: ["#cargo", "#streetwear"],
    trending: true,
    createdAt: Date.now() - 3000,
  },
  {
    id: "p4",
    slug: "ivory-knit-sweater",
    name: "Ivory Knit Sweater",
    description: desc("Chunky-rib mockneck in soft merino blend."),
    category: "women",
    price: 6490,
    images: [sweater, tee],
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Ivory", hex: "#f5f1e6" },
      { name: "Charcoal", hex: "#3a3a3a" },
    ],
    stock: 12,
    sizeChart: "apparel",
    tags: ["#knitwear", "#cozy"],
    featured: true,
    createdAt: Date.now() - 4000,
  },
  {
    id: "p5",
    slug: "draped-maxi-dress",
    name: "Draped Maxi Dress",
    description: desc("Flowing silhouette with adjustable waist tie."),
    category: "women",
    price: 7990,
    salePrice: 5990,
    images: [catWomen, sweater],
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Cream", hex: "#efe6d2" },
      { name: "Black", hex: "#111111" },
    ],
    stock: 7,
    sizeChart: "apparel",
    tags: ["#dress", "#summer"],
    trending: true,
    createdAt: Date.now() - 5000,
  },
  {
    id: "p6",
    slug: "kids-sunshine-hoodie",
    name: "Sunshine Kids Hoodie",
    description: desc("Soft-fleece hoodie that's machine-wash friendly."),
    category: "kids",
    price: 2990,
    images: [catKids, tee],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colors: [
      { name: "Yellow", hex: "#f3b829" },
      { name: "Sky", hex: "#9fc7e8" },
    ],
    stock: 18,
    sizeChart: "kids",
    tags: ["#kids", "#hoodie"],
    featured: true,
    createdAt: Date.now() - 6000,
  },
  {
    id: "p7",
    slug: "leather-tote-bag",
    name: "Onyx Leather Tote",
    description: desc("Full-grain leather tote with brass hardware."),
    category: "accessories",
    price: 12990,
    images: [bag, jacket],
    sizes: ["One Size"],
    colors: [
      { name: "Onyx", hex: "#0e0e0e" },
      { name: "Cognac", hex: "#7b4a2a" },
    ],
    stock: 6,
    sizeChart: "none",
    tags: ["#leather", "#accessory"],
    featured: true,
    trending: true,
    createdAt: Date.now() - 7000,
  },
  {
    id: "p8",
    slug: "kids-denim-set",
    name: "Kids Denim Set",
    description: desc("Two-piece classic denim co-ord."),
    category: "kids",
    price: 4490,
    salePrice: 3290,
    images: [catKids, pants],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    colors: [{ name: "Indigo", hex: "#3b4d72" }],
    stock: 0,
    sizeChart: "kids",
    tags: ["#kids", "#denim"],
    createdAt: Date.now() - 8000,
  },
];
