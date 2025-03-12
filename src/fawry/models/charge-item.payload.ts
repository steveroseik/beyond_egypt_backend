// Define an interface for a charge item
export interface ChargeItem {
  itemId: string;
  description?: string;
  price: string;
  quantity: number;
  imageUrl?: string;
}
