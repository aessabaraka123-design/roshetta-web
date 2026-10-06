import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface Med {
  id: string;
  name: string;
  barcode: string;
  qty: number;
  minQty: number;
  price: number;
  expireDate: string;
  category: string;
  branch: { name: string };
}

interface PosCartItem extends Med {
  cartQty: number;
  cartItemId: string;
  unitName: string;
  unitCount: number;
  unitPrice: number;
  displayName: string;
}

interface User {
  email: string;
  role: string;
  managerName: string;
  pharmacyName: string;
  pharmacy_id: string;
  subscriptionType: string;
  branch: string;
  controlledMedsAccess?: boolean;
  isReadOnly?: boolean;
  username?: string;
  cashierName?: string;
}

interface StoreState {
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  user: User | null;
  token: string | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
  inventory: Med[];
  posCart: PosCartItem[];
  setInventory: (meds: Med[]) => void;
  addToPosCart: (
    med: Med,
    unit?: { name: string; count: number; price: number },
  ) => void;
  updatePosCartQty: (cartItemId: string, delta: number) => void;
  clearPosCart: () => void;
  checkout: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      language: 'ar',
      setLanguage: (lang) => set({ language: lang }),
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, posCart: [] }),

      inventory: [],
      posCart: [],

      setInventory: (meds) => set({ inventory: meds }),

      addToPosCart: (med, unit) =>
        set((state) => {
          const u = unit || { name: "Box", count: 1, price: med.price };
          const cartItemId = `${med.id}-${u.name}`;

          const existing = state.posCart.find(
            (item: any) => item.cartItemId === cartItemId,
          );
          if (existing) {
            return {
              posCart: state.posCart.map((item: any) =>
                item.cartItemId === cartItemId
                  ? { ...item, cartQty: item.cartQty + 1 }
                  : item,
              ),
            };
          }

          const newItem: PosCartItem = {
            ...med,
            cartQty: 1,
            cartItemId,
            unitName: u.name,
            unitCount: u.count,
            unitPrice: u.price,
            displayName: `${med.name} (${u.name})`,
          };

          return { posCart: [newItem, ...state.posCart] };
        }),

      updatePosCartQty: (cartItemId, delta) =>
        set((state) => ({
          posCart: state.posCart
            .map((item: any) =>
              item.cartItemId === cartItemId
                ? { ...item, cartQty: Math.max(0, item.cartQty + delta) }
                : item,
            )
            .filter((item: any) => item.cartQty > 0),
        })),

      clearPosCart: () => set({ posCart: [] }),

      checkout: () =>
        set((state) => {
          const newInventory = state.inventory.map((med: any) => {
            let deduction = 0;
            state.posCart.forEach((c) => {
              if (c.id === med.id) {
                deduction += c.cartQty * c.unitCount;
              }
            });
            if (deduction > 0) {
              return { ...med, qty: Math.max(0, med.qty - deduction) };
            }
            return med;
          });

          return {
            inventory: newInventory,
            posCart: [],
          };
        }),
    }),
    {
      name: "roshetta-web-storage",
       
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : ({} as any),
      ),
    },
  ),
);
