/**
 * Cart store — handles both guest (localStorage) and server-synced cart.
 * Guest cart items are merged into the server cart after login.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "@/types/product";

interface GuestCartItem {
  product: Product;
  quantity: number;
}

interface CartUIState {
  isOpen: boolean;
  guestItems: GuestCartItem[];
  serverCartId: string | null;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Guest cart (pre-login)
  addGuestItem: (product: Product, quantity?: number) => void;
  removeGuestItem: (productId: string) => void;
  updateGuestQuantity: (productId: string, quantity: number) => void;
  clearGuestCart: () => void;

  setServerCartId: (id: string) => void;

  // Computed
  guestItemCount: () => number;
  guestSubtotal: () => number;
}

export const useCartStore = create<CartUIState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      guestItems: [],
      serverCartId: null,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addGuestItem: (product, quantity = 1) => {
        const items = get().guestItems;
        const existing = items.find((i) => i.product.id === product.id);
        if (existing) {
          set({
            guestItems: items.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({ guestItems: [...items, { product, quantity }] });
        }
      },

      removeGuestItem: (productId) =>
        set((s) => ({ guestItems: s.guestItems.filter((i) => i.product.id !== productId) })),

      updateGuestQuantity: (productId, quantity) => {
        if (quantity < 1) {
          get().removeGuestItem(productId);
          return;
        }
        set((s) => ({
          guestItems: s.guestItems.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }));
      },

      clearGuestCart: () => set({ guestItems: [] }),
      setServerCartId: (id) => set({ serverCartId: id }),

      guestItemCount: () => get().guestItems.reduce((sum, i) => sum + i.quantity, 0),
      guestSubtotal: () =>
        get().guestItems.reduce((sum, i) => sum + i.product.effective_price * i.quantity, 0),
    }),
    {
      name: "sf-cart",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({ guestItems: state.guestItems }),
    }
  )
);
