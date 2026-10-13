import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface Med {
  id: string;
  name: string;
  barcode: string;
  qty: number;
  minQty: number;
  price: number;
  cost?: number;
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
  unitCost?: number;
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
  name?: string;
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
    unit?: { name: string; count: number; price: number; cost?: number; ratio?: number },
  ) => void;
  updatePosCartQty: (cartItemId: string, delta: number) => void;
  clearPosCart: () => void;
  checkout: () => void;
}

// ─── Synchronous Session Restorers (Prevents logouts on F5 Refresh) ─────────
const getInitialUser = (): User | null => {
  if (typeof window === "undefined") return null;
  try {
    const directUser = localStorage.getItem("roshetta_user");
    if (directUser) {
      return JSON.parse(directUser);
    }
    const zustandData = localStorage.getItem("roshetta-web-storage");
    if (zustandData) {
      const parsed = JSON.parse(zustandData);
      if (parsed?.state?.user) return parsed.state.user;
    }
  } catch (e) {
    console.error("Failed to read stored user session:", e);
  }
  return null;
};

const getInitialToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const directToken = localStorage.getItem("roshetta_token");
    if (directToken) return directToken;

    const zustandData = localStorage.getItem("roshetta-web-storage");
    if (zustandData) {
      const parsed = JSON.parse(zustandData);
      if (parsed?.state?.token) return parsed.state.token;
    }
  } catch (e) {
    console.error("Failed to read stored token:", e);
  }
  return null;
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      language: 'ar',
      setLanguage: (lang) => set({ language: lang }),
      user: getInitialUser(),
      token: getInitialToken(),
      login: (user, token) => {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("roshetta_user", JSON.stringify(user));
            if (token) {
              localStorage.setItem("roshetta_token", token);
              document.cookie = `roshetta_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
            }
          } catch (e) {
            console.error("Failed to persist user session to storage:", e);
          }
        }
        set({ user, token: token || null });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("roshetta_user");
            localStorage.removeItem("roshetta_token");
            localStorage.removeItem("roshetta-web-storage");
            document.cookie = "roshetta_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          } catch (e) {
            console.error("Failed to remove stored session:", e);
          }
        }
        set({ user: null, token: null, posCart: [] });
      },

      inventory: [],
      posCart: [],

      setInventory: (meds) => set({ inventory: meds }),

      addToPosCart: (med, unit) =>
        set((state) => {
          const u = unit || { name: "Box", count: 1, price: med.price, cost: med.cost };
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

          const baseCost = med.cost != null ? Number(med.cost) : (Number(med.price || 0) * 0.7);
          const itemUnitCost = u.cost !== undefined ? Number(u.cost) : (baseCost * (u.ratio || 1));

          const newItem: PosCartItem = {
            ...med,
            price: u.price,
            cost: itemUnitCost,
            unitCost: itemUnitCost,
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
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window !== "undefined" && state) {
          const u = getInitialUser();
          const t = getInitialToken();
          if (u && !state.user) {
            state.user = u;
          }
          if (t && !state.token) {
            state.token = t;
          }
        }
      },
    },
  ),
);
