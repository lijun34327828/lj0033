import { create } from "zustand";
import type {
  Property,
  Order,
  CalendarDay,
  CheckInRecord,
  CleaningTask,
  RevenueStats,
  ExtraServiceCatalog,
  ExtraServiceItem,
  PenaltyCalculation,
} from "@/types";

interface PropertyState {
  properties: Property[];
  currentProperty: Property | null;
  calendar: CalendarDay[];
  filters: {
    zone: string;
    type: string;
    priceMin: string;
    priceMax: string;
    amenities: string[];
  };
  loading: boolean;
  fetchProperties: () => Promise<void>;
  fetchProperty: (id: string) => Promise<void>;
  fetchCalendar: (propertyId: string, year: number, month: number) => Promise<void>;
  setFilters: (filters: Partial<PropertyState["filters"]>) => void;
  updatePropertyStatus: (id: string, status: Property["status"]) => Promise<void>;
  addBlackout: (propertyId: string, startDate: string, endDate: string) => Promise<void>;
}

export const usePropertyStore = create<PropertyState>((set) => ({
  properties: [],
  currentProperty: null,
  calendar: [],
  filters: { zone: "", type: "", priceMin: "", priceMax: "", amenities: [] },
  loading: false,
  fetchProperties: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/properties");
      const data = await res.json();
      set({ properties: data.data || data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  fetchProperty: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/properties/${id}`);
      const data = await res.json();
      set({ currentProperty: data.data || data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  fetchCalendar: async (propertyId, year, month) => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/calendar?year=${year}&month=${month}`);
      const data = await res.json();
      set({ calendar: data.data || data || [] });
    } catch {
      set({ calendar: [] });
    }
  },
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  updatePropertyStatus: async (id, status) => {
    try {
      await fetch(`/api/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      set((state) => ({
        properties: state.properties.map((p) => (p.id === id ? { ...p, status } : p)),
      }));
    } catch {}
  },
  addBlackout: async (propertyId, startDate, endDate) => {
    try {
      await fetch(`/api/properties/${propertyId}/blackout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
    } catch {}
  },
}));

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  fetchOrders: (status?: string) => Promise<void>;
  fetchOrder: (id: string) => Promise<void>;
  cancelOrder: (id: string) => Promise<PenaltyCalculation | null>;
  createOrder: (order: Partial<Order>) => Promise<Order | null>;
  checkIn: (id: string) => Promise<void>;
  completeOrder: (id: string) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  currentOrder: null,
  loading: false,
  fetchOrders: async (status) => {
    set({ loading: true });
    try {
      const url = status && status !== "all" ? `/api/orders?status=${status}` : "/api/orders";
      const res = await fetch(url);
      const data = await res.json();
      set({ orders: data.data || data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  fetchOrder: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      set({ currentOrder: data.data || data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  cancelOrder: async (id) => {
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: "PUT" });
      const data = await res.json();
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: "cancelled" as const } : o
        ),
        currentOrder:
          state.currentOrder?.id === id
            ? { ...state.currentOrder, status: "cancelled" as const }
            : state.currentOrder,
      }));
      return data.data || data;
    } catch {
      return null;
    }
  },
  createOrder: async (order) => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = await res.json();
      return data.data || data;
    } catch {
      return null;
    }
  },
  checkIn: async (id) => {
    try {
      await fetch(`/api/orders/${id}/checkin`, { method: "PUT" });
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: "checked_in" as const } : o
        ),
        currentOrder:
          state.currentOrder?.id === id
            ? { ...state.currentOrder, status: "checked_in" as const }
            : state.currentOrder,
      }));
    } catch {}
  },
  completeOrder: async (id) => {
    try {
      await fetch(`/api/orders/${id}/complete`, { method: "PUT" });
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: "completed" as const } : o
        ),
        currentOrder:
          state.currentOrder?.id === id
            ? { ...state.currentOrder, status: "completed" as const }
            : state.currentOrder,
      }));
    } catch {}
  },
}));

interface RecordState {
  records: CheckInRecord[];
  loading: boolean;
  fetchRecords: (keyword?: string) => Promise<void>;
}

export const useRecordStore = create<RecordState>((set) => ({
  records: [],
  loading: false,
  fetchRecords: async (keyword) => {
    set({ loading: true });
    try {
      const url = keyword ? `/api/records?search=${encodeURIComponent(keyword)}` : "/api/records";
      const res = await fetch(url);
      const data = await res.json();
      set({ records: data.data || data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));

interface AdminState {
  cleaningTasks: CleaningTask[];
  revenueStats: RevenueStats | null;
  loading: boolean;
  fetchCleaningTasks: () => Promise<void>;
  createCleaningTask: (task: Partial<CleaningTask>) => Promise<void>;
  updateCleaningTaskStatus: (id: string) => Promise<void>;
  fetchRevenueStats: (period?: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  cleaningTasks: [],
  revenueStats: null,
  loading: false,
  fetchCleaningTasks: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/cleaning");
      const data = await res.json();
      set({ cleaningTasks: data.data || data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  createCleaningTask: async (task) => {
    try {
      await fetch("/api/cleaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
    } catch {}
  },
  updateCleaningTaskStatus: async (id) => {
    try {
      const state = get();
      const task = state.cleaningTasks.find((t) => t.id === id);
      if (!task) return;
      const next = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "completed" : task.status;
      await fetch(`/api/cleaning/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      set((state) => ({
        cleaningTasks: state.cleaningTasks.map((t) => {
          if (t.id !== id) return t;
          return { ...t, status: next };
        }),
      }));
    } catch {}
  },
  fetchRevenueStats: async (period) => {
    set({ loading: true });
    try {
      const url = period ? `/api/stats/revenue?period=${period}` : "/api/stats/revenue";
      const res = await fetch(url);
      const data = await res.json();
      set({ revenueStats: data.data || data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));

interface BookingState {
  checkIn: string;
  checkOut: string;
  guests: number;
  maxGuests: number | null;
  extraServices: ExtraServiceItem[];
  isAvailable: boolean | null;
  setCheckIn: (date: string) => void;
  setCheckOut: (date: string) => void;
  setGuests: (count: number, max?: number) => void;
  setMaxGuests: (max: number) => void;
  addService: (service: ExtraServiceCatalog) => void;
  removeService: (id: string) => void;
  updateServiceQuantity: (id: string, quantity: number) => void;
  validateSlots: (propertyId: string) => Promise<void>;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  checkIn: "",
  checkOut: "",
  guests: 1,
  maxGuests: null,
  extraServices: [],
  isAvailable: null,
  setCheckIn: (date) => set({ checkIn: date, isAvailable: null }),
  setCheckOut: (date) => set({ checkOut: date, isAvailable: null }),
  setGuests: (count, max) => {
    const upperBound = max ?? get().maxGuests ?? Infinity;
    set({ guests: Math.max(1, Math.min(count, upperBound)) });
  },
  setMaxGuests: (max) => set({ maxGuests: max }),
  addService: (service) =>
    set((state) => ({
      extraServices: [
        ...state.extraServices.filter((s) => s.id !== service.id),
        { id: service.id, name: service.name, price: service.price, quantity: 1 },
      ],
    })),
  removeService: (id) =>
    set((state) => ({
      extraServices: state.extraServices.filter((s) => s.id !== id),
    })),
  updateServiceQuantity: (id, quantity) =>
    set((state) => ({
      extraServices: state.extraServices.map((s) =>
        s.id === id ? { ...s, quantity: Math.max(0, quantity) } : s
      ).filter((s) => s.quantity > 0),
    })),
  validateSlots: async (propertyId) => {
    const { checkIn, checkOut } = get();
    if (!checkIn || !checkOut) {
      set({ isAvailable: null });
      return;
    }
    try {
      const res = await fetch("/api/slots/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, checkIn, checkOut }),
      });
      const data = await res.json();
      set({ isAvailable: data.available ?? data.data?.available ?? false });
    } catch {
      set({ isAvailable: false });
    }
  },
  reset: () =>
    set({ checkIn: "", checkOut: "", guests: 1, maxGuests: null, extraServices: [], isAvailable: null }),
}));

interface ExtraServiceState {
  catalog: ExtraServiceCatalog[];
  fetchCatalog: () => Promise<void>;
}

export const useExtraServiceStore = create<ExtraServiceState>((set) => ({
  catalog: [],
  fetchCatalog: async () => {
    try {
      const res = await fetch("/api/extra-services");
      const data = await res.json();
      set({ catalog: data.data || data });
    } catch {}
  },
}));
