export interface Property {
  id: string;
  name: string;
  zone: string;
  type: "entire" | "room";
  bedrooms: number;
  maxGuests: number;
  baseGuests: number;
  basePrice: number;
  extraGuestPrice: number;
  amenities: string[];
  images: string[];
  status: "available" | "occupied" | "maintenance";
  description: string;
}

export interface Order {
  id: string;
  propertyId: string;
  propertyName?: string;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  extraServices: ExtraServiceItem[];
  status: "pending" | "checked_in" | "completed" | "cancelled";
  totalAmount: number;
  penaltyAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExtraServiceItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CalendarDay {
  date: string;
  status: "available" | "booked" | "maintenance" | "blackout";
  orderId?: string;
}

export interface CheckInRecord {
  id: string;
  orderId: string;
  propertyId: string;
  propertyName?: string;
  guestName: string;
  guestPhone: string;
  idCard: string;
  checkIn: string;
  checkOut: string;
  actualAmount: number;
  extraServices: ExtraServiceItem[];
  createdAt: string;
}

export interface CleaningTask {
  id: string;
  propertyId: string;
  propertyName?: string;
  scheduledDate: string;
  status: "pending" | "in_progress" | "completed";
  assignee: string;
}

export interface RevenueStats {
  totalRevenue: number;
  occupancyRate: number;
  avgPrice: number;
  monthlyRevenue: { month: string; revenue: number }[];
  topProperties: { id: string; name: string; revenue: number; bookings: number }[];
}

export interface PenaltyCalculation {
  originalAmount: number;
  penaltyRate: number;
  penaltyAmount: number;
  refundAmount: number;
  rule: string;
}

export interface ExtraServiceCatalog {
  id: string;
  name: string;
  price: number;
  description: string;
}
