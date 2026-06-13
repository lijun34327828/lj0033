import { useEffect, useState, useMemo } from "react";
import { usePropertyStore } from "@/store";
import PropertyCard from "@/components/PropertyCard";
import Calendar from "@/components/Calendar";
import { X, Search } from "lucide-react";
import type { Property } from "@/types";

const ZONES = [
  { value: "", label: "全部" },
  { value: "山景区", label: "山景区" },
  { value: "湖景区", label: "湖景区" },
  { value: "花田区", label: "花田区" },
];

const TYPES = [
  { value: "", label: "全部" },
  { value: "entire", label: "整租" },
  { value: "room", label: "单间" },
];

const AMENITY_OPTIONS = ["WiFi", "停车场", "厨房", "泳池"];

export default function Home() {
  const { properties, filters, fetchProperties, setFilters, calendar, fetchCalendar } =
    usePropertyStore();
  const [calendarProperty, setCalendarProperty] = useState<Property | null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    if (calendarProperty) {
      fetchCalendar(calendarProperty.id, calYear, calMonth);
    }
  }, [calendarProperty, calYear, calMonth, fetchCalendar]);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (filters.zone && p.zone !== filters.zone) return false;
      if (filters.type && p.type !== filters.type) return false;
      if (filters.priceMin && p.basePrice < Number(filters.priceMin)) return false;
      if (filters.priceMax && p.basePrice > Number(filters.priceMax)) return false;
      if (filters.amenities.length > 0) {
        if (!filters.amenities.every((a) => p.amenities.includes(a))) return false;
      }
      return true;
    });
  }, [properties, filters]);

  function toggleAmenity(amenity: string) {
    setFilters({
      amenities: filters.amenities.includes(amenity)
        ? filters.amenities.filter((a) => a !== amenity)
        : [...filters.amenities, amenity],
    });
  }

  function openCalendar(property: Property) {
    setCalendarProperty(property);
    setCalYear(new Date().getFullYear());
    setCalMonth(new Date().getMonth() + 1);
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-earth-400" />
            <span className="text-sm text-earth-500">区域:</span>
            <div className="flex gap-1">
              {ZONES.map((z) => (
                <button
                  key={z.value}
                  onClick={() => setFilters({ zone: z.value })}
                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                    filters.zone === z.value
                      ? "bg-earth-500 text-white"
                      : "bg-earth-50 text-earth-600 hover:bg-earth-100"
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-earth-500">类型:</span>
            <div className="flex gap-1">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setFilters({ type: t.value })}
                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                    filters.type === t.value
                      ? "bg-earth-500 text-white"
                      : "bg-earth-50 text-earth-600 hover:bg-earth-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-earth-500">价格:</span>
            <input
              type="number"
              placeholder="最低"
              value={filters.priceMin}
              onChange={(e) => setFilters({ priceMin: e.target.value })}
              className="w-20 px-2 py-1 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
            />
            <span className="text-earth-300">-</span>
            <input
              type="number"
              placeholder="最高"
              value={filters.priceMax}
              onChange={(e) => setFilters({ priceMax: e.target.value })}
              className="w-20 px-2 py-1 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-earth-500">设施:</span>
            <div className="flex gap-1">
              {AMENITY_OPTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                    filters.amenities.includes(a)
                      ? "bg-earth-500 text-white"
                      : "bg-earth-50 text-earth-600 hover:bg-earth-100"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => (
          <PropertyCard key={p.id} property={p} onCalendarOpen={openCalendar} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-earth-400">
          <p className="text-lg">暂无符合条件的房源</p>
        </div>
      )}

      {calendarProperty && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold text-earth-900">
                {calendarProperty.name} - 房态日历
              </h2>
              <button
                onClick={() => setCalendarProperty(null)}
                className="p-1 rounded-lg hover:bg-earth-50 transition-all duration-200"
              >
                <X className="w-5 h-5 text-earth-400" />
              </button>
            </div>
            <Calendar
              year={calYear}
              month={calMonth}
              calendarDays={calendar}
              onPrevMonth={() => {
                if (calMonth === 1) { setCalYear(calYear - 1); setCalMonth(12); }
                else setCalMonth(calMonth - 1);
              }}
              onNextMonth={() => {
                if (calMonth === 12) { setCalYear(calYear + 1); setCalMonth(1); }
                else setCalMonth(calMonth + 1);
              }}
            />
            <div className="flex items-center gap-4 mt-4 text-xs text-earth-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-forest-500" /> 可订
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-crimson-500" /> 已订
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" /> 维护
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
