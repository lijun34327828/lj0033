import { useNavigate } from "react-router-dom";
import { Users, BedDouble, Wifi, Car, UtensilsCrossed, Waves } from "lucide-react";
import type { Property } from "@/types";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="w-3.5 h-3.5" />,
  停车场: <Car className="w-3.5 h-3.5" />,
  厨房: <UtensilsCrossed className="w-3.5 h-3.5" />,
  泳池: <Waves className="w-3.5 h-3.5" />,
};

const ZONE_LABELS: Record<string, string> = {
  "山景区": "山景区",
  "湖景区": "湖景区",
  "花田区": "花田区",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  available: { label: "可预订", color: "bg-forest-500 text-white" },
  occupied: { label: "已入住", color: "bg-crimson-500 text-white" },
  maintenance: { label: "维护中", color: "bg-gray-400 text-white" },
};

interface PropertyCardProps {
  property: Property;
  onCalendarOpen?: (property: Property) => void;
}

const IMAGE_PROMPTS: Record<string, string> = {
  "山景区": "cozy%20mountain%20cabin%20homestay%20exterior%20autumn%20forest",
  "湖景区": "lakeside%20villa%20with%20garden%20serene%20water%20view",
  "花田区": "flower%20field%20cottage%20countryside%20bloom%20pastoral",
};

export default function PropertyCard({ property, onCalendarOpen }: PropertyCardProps) {
  const navigate = useNavigate();
  const statusInfo = STATUS_MAP[property.status] || STATUS_MAP.available;
  const prompt = IMAGE_PROMPTS[property.zone] || "beautiful%20homestay%20exterior%20warm%20lighting";

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onCalendarOpen?.(property)}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=landscape_16_9`}
          alt={property.name}
          className="w-full h-full object-cover"
        />
        <span className="absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-medium bg-earth-200 text-earth-800">
          {ZONE_LABELS[property.zone] || property.zone}
        </span>
        <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium text-forest-500 bg-forest-500/10">
          {property.type === "entire" ? "整租" : "单间"}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold text-earth-900 mb-2">
          {property.name}
        </h3>
        <div className="flex items-center gap-3 mb-2 text-earth-500 text-sm">
          <span className="flex items-center gap-1">
            <BedDouble className="w-3.5 h-3.5" />
            {property.bedrooms}室
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            最多{property.maxGuests}人
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {property.amenities.slice(0, 4).map((a) => (
            <span
              key={a}
              className="flex items-center gap-1 text-xs text-earth-500 bg-earth-50 px-2 py-0.5 rounded"
            >
              {AMENITY_ICONS[a] || null}
              {a}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-earth-500 font-bold text-xl">¥{property.basePrice}</span>
            <span className="text-earth-400 text-sm">/晚</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {property.status === "available" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/booking/${property.id}`);
                }}
                className="px-4 py-1.5 rounded-lg bg-earth-500 text-white text-sm font-medium hover:bg-earth-600 transition-all duration-200"
              >
                立即预约
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
