import { site } from "@/config/site";

export const formatPrice = (n: number) =>
  `${site.currencySymbol} ${n.toLocaleString("en-PK")}`;

export const cn = (...c: (string | false | undefined | null)[]) =>
  c.filter(Boolean).join(" ");
