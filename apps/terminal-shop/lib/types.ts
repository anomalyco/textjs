/** Terminal API shapes (subset of https://api.terminal.shop/doc used by the shop). */

export type Region = "na" | "eu" | "global";
export type Env = "dev" | "prod";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  stripeCustomerID?: string | null;
}

export interface Profile {
  user: User;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  variants: ProductVariant[];
  order?: number;
  subscription?: "allowed" | "required";
  tags?: { app?: string; color?: string; featured?: boolean; market_na?: boolean; market_eu?: boolean; market_global?: boolean };
}

export interface CartItem {
  id?: string;
  productVariantID: string;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  addressID?: string;
  cardID?: string;
  amount: { subtotal: number; shipping?: number; total?: number };
  shipping?: { service?: string; timeframe?: string };
}

export interface AddressInput {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

export interface Address extends AddressInput {
  id: string;
  created?: string;
}

export interface Card {
  id: string;
  brand: string;
  expiration: { year: number; month: number };
  last4: string;
  created?: string;
}

export type Schedule = { type: "fixed" } | { type: "weekly"; interval: number };

export interface Subscription {
  id: string;
  productVariantID: string;
  price: number;
  quantity: number;
  addressID: string;
  cardID: string;
  schedule?: Schedule;
  next?: string;
  created: string;
}

export interface SubscriptionInput {
  productVariantID: string;
  quantity: number;
  addressID: string;
  cardID: string;
  schedule?: Schedule;
}

export interface OrderItem {
  id: string;
  description?: string;
  amount: number;
  quantity: number;
  productVariantID?: string;
}

export interface Order {
  id: string;
  index?: number;
  status: "placed" | "printed" | "shipped" | "delivered" | "canceled";
  fulfillmentStarted: boolean;
  canCancel: boolean;
  canUpdateShipping: boolean;
  changeUnavailableReason?: string;
  shipping: AddressInput;
  created: string;
  amount: { shipping: number; subtotal: number };
  tracking: { service?: string; number?: string; url?: string; status?: string };
  items: OrderItem[];
}

export interface Token {
  id: string;
  created: string;
  /** Masked except right after creation. */
  token: string;
}

export interface App {
  id: string;
  name: string;
  redirectURI: string;
  secret: string;
}

export interface ViewInit {
  profile: Profile;
  products: Product[];
  cart: Cart;
  addresses: Address[];
  cards: Card[];
  subscriptions: Subscription[];
  orders: Order[];
  tokens: Token[];
  apps: App[];
  region: Region;
}

export const EMPTY_CART: Cart = { items: [], subtotal: 0, amount: { subtotal: 0 } };
