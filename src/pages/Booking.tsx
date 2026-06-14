import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePropertyStore, useBookingStore, useExtraServiceStore, useOrderStore } from "@/store";
import Calendar from "@/components/Calendar";
import { CheckCircle, AlertCircle, Minus, Plus } from "lucide-react";

const ZONE_LABELS: Record<string, string> = {
  "山景区": "山景区",
  "湖景区": "湖景区",
  "花田区": "花田区",
};

export default function Booking() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { currentProperty, fetchProperty, calendar, fetchCalendar } = usePropertyStore();
  const booking = useBookingStore();
  const { catalog, fetchCatalog } = useExtraServiceStore();
  const { createOrder } = useOrderStore();
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [secondYear, setSecondYear] = useState(
    new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()
  );
  const [secondMonth, setSecondMonth] = useState(
    new Date().getMonth() === 11 ? 1 : new Date().getMonth() + 2
  );
  const [submitting, setSubmitting] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (propertyId) {
      fetchProperty(propertyId);
      fetchCatalog();
    }
    return () => booking.reset();
  }, [propertyId]);

  useEffect(() => {
    if (currentProperty?.maxGuests) {
      booking.setMaxGuests(currentProperty.maxGuests);
    }
  }, [currentProperty]);

  useEffect(() => {
    if (propertyId) {
      fetchCalendar(propertyId, calYear, calMonth);
    }
  }, [propertyId, calYear, calMonth, fetchCalendar]);

  useEffect(() => {
    if (booking.checkIn && booking.checkOut && propertyId) {
      booking.validateSlots(propertyId);
    }
  }, [booking.checkIn, booking.checkOut, propertyId]);

  const nights = useMemo(() => {
    if (!booking.checkIn || !booking.checkOut) return 0;
    const diff = new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [booking.checkIn, booking.checkOut]);

  const feeBreakdown = useMemo(() => {
    if (!currentProperty) return { room: 0, extraGuest: 0, services: 0, total: 0 };
    const basePrice = Number(currentProperty.basePrice) || 0;
    const baseGuests = Number(currentProperty.baseGuests) || 0;
    const extraGuestPrice = Number(currentProperty.extraGuestPrice) || 0;
    const room = nights * basePrice;
    const extraGuests = Math.max(0, booking.guests - baseGuests);
    const extraGuest = extraGuests * nights * extraGuestPrice;
    const services = booking.extraServices.reduce((s, sv) => s + (Number(sv.price) || 0) * (Number(sv.quantity) || 0), 0);
    return { room, extraGuest, services, total: room + extraGuest + services };
  }, [currentProperty, nights, booking.guests, booking.extraServices]);

  const conflictDates = useMemo(() => {
    return calendar
      .filter((d) => d.status === "booked" || d.status === "maintenance" || d.status === "blackout")
      .map((d) => d.date);
  }, [calendar]);

  function handleSelectDate(date: string) {
    if (!booking.checkIn || (booking.checkIn && booking.checkOut)) {
      booking.setCheckIn(date);
      booking.setCheckOut("");
    } else {
      if (date <= booking.checkIn) {
        booking.setCheckIn(date);
        booking.setCheckOut("");
      } else {
        booking.setCheckOut(date);
      }
    }
  }

  async function handleSubmit() {
    if (!propertyId || !currentProperty) return;
    setFormError("");

    if (!guestName.trim()) {
      setFormError("请输入客人姓名");
      return;
    }
    if (!guestPhone.trim()) {
      setFormError("请输入联系电话");
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(guestPhone)) {
      setFormError("请输入正确的手机号码");
      return;
    }
    if (!booking.checkIn || !booking.checkOut) {
      setFormError("请选择入住和离店日期");
      return;
    }
    if (booking.isAvailable === false) {
      setFormError("所选日期存在冲突，请重新选择");
      return;
    }

    setSubmitting(true);
    const order = await createOrder({
      propertyId,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      extraServices: booking.extraServices,
      totalAmount: feeBreakdown.total,
    });
    setSubmitting(false);
    if (order) {
      navigate("/orders");
    } else {
      setFormError("订单创建失败，请稍后重试");
    }
  }

  if (!currentProperty) {
    return <div className="text-center py-20 text-earth-400">加载中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-2xl font-bold text-earth-900">{currentProperty.name}</h1>
          <span className="px-3 py-1 rounded-full text-sm bg-earth-200 text-earth-700">
            {ZONE_LABELS[currentProperty.zone] || currentProperty.zone}
          </span>
          <span className="px-3 py-1 rounded-full text-sm bg-forest-500/10 text-forest-500">
            {currentProperty.type === "entire" ? "整租" : "单间"}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-serif text-lg font-semibold text-earth-900 mb-4">选择日期</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Calendar
                year={calYear}
                month={calMonth}
                calendarDays={calendar}
                selectedRange={{ start: booking.checkIn, end: booking.checkOut }}
                conflictDates={conflictDates}
                onSelectDate={handleSelectDate}
                onPrevMonth={() => {
                  if (calMonth === 1) { setCalYear(calYear - 1); setCalMonth(12); }
                  else setCalMonth(calMonth - 1);
                }}
                onNextMonth={() => {
                  if (calMonth === 12) { setCalYear(calYear + 1); setCalMonth(1); }
                  else setCalMonth(calMonth + 1);
                }}
              />
              <Calendar
                year={secondYear}
                month={secondMonth}
                calendarDays={calendar}
                selectedRange={{ start: booking.checkIn, end: booking.checkOut }}
                conflictDates={conflictDates}
                onSelectDate={handleSelectDate}
                onPrevMonth={() => {
                  if (secondMonth === 1) { setSecondYear(secondYear - 1); setSecondMonth(12); }
                  else setSecondMonth(secondMonth - 1);
                }}
                onNextMonth={() => {
                  if (secondMonth === 12) { setSecondYear(secondYear + 1); setSecondMonth(1); }
                  else setSecondMonth(secondMonth + 1);
                }}
              />
            </div>
            {booking.checkIn && booking.checkOut && (
              <div className="mt-4 flex items-center gap-2">
                {booking.isAvailable === true && (
                  <span className="flex items-center gap-1 text-forest-500 text-sm">
                    <CheckCircle className="w-4 h-4" /> 该时段可预订
                  </span>
                )}
                {booking.isAvailable === false && (
                  <span className="flex items-center gap-1 text-crimson-500 text-sm">
                    <AlertCircle className="w-4 h-4" /> 该时段存在冲突
                  </span>
                )}
                {booking.isAvailable === null && (
                  <span className="text-earth-400 text-sm">验证中...</span>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-serif text-lg font-semibold text-earth-900 mb-4">客人信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-earth-500 mb-1">客人姓名</label>
                <input
                  type="text"
                  placeholder="请输入客人姓名"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
                />
              </div>
              <div>
                <label className="block text-sm text-earth-500 mb-1">联系电话</label>
                <input
                  type="tel"
                  placeholder="请输入手机号码"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
                />
              </div>
            </div>
            {formError && (
              <p className="mt-3 text-sm text-crimson-500">{formError}</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-serif text-lg font-semibold text-earth-900 mb-4">入住人数</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => booking.setGuests(booking.guests - 1)}
                disabled={booking.guests <= 1}
                className="p-2 rounded-lg border border-earth-200 hover:bg-earth-50 disabled:opacity-30 transition-all duration-200"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-semibold text-earth-900 w-12 text-center">{booking.guests}</span>
              <button
                onClick={() => booking.setGuests(booking.guests + 1, currentProperty.maxGuests)}
                disabled={booking.guests >= (currentProperty.maxGuests || Infinity)}
                className="p-2 rounded-lg border border-earth-200 hover:bg-earth-50 disabled:opacity-30 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm text-earth-400">
                (基础{currentProperty.baseGuests || 0}人，最多{currentProperty.maxGuests || 0}人)
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-serif text-lg font-semibold text-earth-900 mb-4">增值服务</h2>
            <div className="space-y-3">
              {catalog.map((service) => {
                const selected = booking.extraServices.find((s) => s.id === service.id);
                return (
                  <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-earth-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() =>
                          selected ? booking.removeService(service.id) : booking.addService(service)
                        }
                        className="w-4 h-4 rounded border-earth-300 text-earth-500 focus:ring-earth-400"
                      />
                      <div>
                        <span className="text-sm font-medium text-earth-800">{service.name}</span>
                        <span className="ml-2 text-xs text-earth-400">¥{service.price}</span>
                      </div>
                    </div>
                    {selected && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => booking.updateServiceQuantity(service.id, selected.quantity - 1)}
                          className="p-1 rounded border border-earth-200 hover:bg-earth-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm">{selected.quantity}</span>
                        <button
                          onClick={() => booking.updateServiceQuantity(service.id, selected.quantity + 1)}
                          className="p-1 rounded border border-earth-200 hover:bg-earth-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {catalog.length === 0 && (
                <p className="text-sm text-earth-400">暂无增值服务</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-80">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
            <h2 className="font-serif text-lg font-semibold text-earth-900 mb-4">费用明细</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-earth-500">房费 ({nights}晚 × ¥{Number(currentProperty.basePrice) || 0})</span>
                <span className="text-earth-800">¥{feeBreakdown.room || 0}</span>
              </div>
              {feeBreakdown.extraGuest > 0 && (
                <div className="flex justify-between">
                  <span className="text-earth-500">
                    加人费 ({Math.max(0, booking.guests - (Number(currentProperty.baseGuests) || 0))}人 × {nights}晚 × ¥{Number(currentProperty.extraGuestPrice) || 0})
                  </span>
                  <span className="text-earth-800">¥{feeBreakdown.extraGuest || 0}</span>
                </div>
              )}
              {feeBreakdown.services > 0 && (
                <div className="flex justify-between">
                  <span className="text-earth-500">增值服务</span>
                  <span className="text-earth-800">¥{feeBreakdown.services || 0}</span>
                </div>
              )}
              <div className="border-t border-earth-100 pt-3 flex justify-between">
                <span className="font-semibold text-earth-800">合计</span>
                <span className="text-xl font-bold text-earth-500">¥{feeBreakdown.total || 0}</span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!booking.checkIn || !booking.checkOut || submitting || booking.isAvailable === false}
              className="w-full mt-6 py-3 rounded-lg bg-earth-500 text-white font-medium hover:bg-earth-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitting ? "提交中..." : "确认预约"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
