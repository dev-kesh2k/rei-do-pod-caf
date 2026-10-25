export type Brand = { id: string; name: string; sortOrder: number; active: boolean; products: number };
export type Flavor = { id: string; name: string; available: boolean; sortOrder: number };
export type Product = {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  brand: { id: string; name: string };
  puffs: number | null;
  series: string;
  photoUrl: string;
  sortOrder: number;
  active: boolean;
  noFlavor: boolean;
  inStock: boolean;
  flavors: Flavor[];
};
