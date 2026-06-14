import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderStore } from "@/store";
import { Search, X } from "lucide-react";
import type { PenaltyCalculation } from "@/types";

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待入住" },
  { value: "checked_in", label: "入住中" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: "待入住", color: "bg-yellow-100 text-yellow-700" },
  checked_in: { label: "入住中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-500" },
};

export default function Orders() {
  const navigate = useNavigate();
  const { orders, fetchOrders, cancelOrder, checkIn } = useOrderStore();
  const [activeTab, setActiveTab] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [penalty, setPenalty] = useState<PenaltyCalculation | null>(null);

  useEffect(() => {
    fetchOrders(activeTab === "all" ? undefined : activeTab);
  }, [activeTab, fetchOrders]);

  const filtered = useMemo(() => {
    if (!keyword) return orders;
    const k = keyword.toLowerCase();
    return orders.filter(
      (o) =>
        o.guestName.toLowerCase().includes(k) || o.guestPhone.includes(k)
    );
  }, [orders, keyword]);

  async function handleCancel(orderId: string) {
    const result = await cancelOrder(orderId);
    setPenalty(result);
    setCancelModal(null);
  }

  async function handleCheckIn(orderId: string) {
    await checkIn(orderId);
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.value
                    ? "bg-earth-500 text-white"
                    : "bg-earth-50 text-earth-600 hover:bg-earth-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
            <input
              type="text"
              placeholder="搜索姓名或手机号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9 pr-4 py-2 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400 w-56"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((order) => {
          const badge = STATUS_BADGES[order.status] || STATUS_BADGES.pending;
          return (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-earth-400 font-mono">
                    {order.id.slice(0, 8)}...
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <span className="text-lg font-bold text-earth-500">¥{Number(order.totalAmount) || 0}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-earth-400">房源</span>
                  <p className="text-earth-800 font-medium">{order.propertyName || order.propertyId}</p>
                </div>
                <div>
                  <span className="text-earth-400">客人</span>
                  <p className="text-earth-800">{order.guestName}</p>
                </div>
                <div>
                  <span className="text-earth-400">入住</span>
                  <p className="text-earth-800">{order.checkIn}</p>
                </div>
                <div>
                  <span className="text-earth-400">退房</span>
                  <p className="text-earth-800">{order.checkOut}</p>
                </div>
              </div>
              {order.status === "pending" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-earth-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckIn(order.id);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-forest-500 text-white text-sm hover:bg-forest-600 transition-all duration-200"
                  >
                    办理入住
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCancelModal(order.id);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-crimson-500 text-white text-sm hover:bg-crimson-600 transition-all duration-200"
                  >
                    取消订单
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-earth-400">
          <p className="text-lg">暂无订单</p>
        </div>
      )}

      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-earth-900">确认取消订单</h3>
              <button onClick={() => setCancelModal(null)} className="p-1 rounded-lg hover:bg-earth-50">
                <X className="w-5 h-5 text-earth-400" />
              </button>
            </div>
            <p className="text-sm text-earth-600 mb-4">
              取消订单可能会产生违约金，确认要取消吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 py-2 rounded-lg border border-earth-200 text-earth-600 hover:bg-earth-50 transition-all duration-200"
              >
                返回
              </button>
              <button
                onClick={() => handleCancel(cancelModal)}
                className="flex-1 py-2 rounded-lg bg-crimson-500 text-white hover:bg-crimson-600 transition-all duration-200"
              >
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}

      {penalty && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <h3 className="font-serif text-lg font-semibold text-earth-900 mb-4">取消结果</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-earth-500">原金额</span>
                <span>¥{Number(penalty.originalAmount) || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-earth-500">违约金率</span>
                <span>{((Number(penalty.penaltyRate) || 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-earth-500">违约金</span>
                <span className="text-crimson-500">¥{Number(penalty.penaltyAmount) || 0}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-earth-500">退款金额</span>
                <span className="text-forest-500 font-semibold">¥{Number(penalty.refundAmount) || 0}</span>
              </div>
              <p className="text-xs text-earth-400 mt-2">规则：{penalty.rule}</p>
            </div>
            <button
              onClick={() => setPenalty(null)}
              className="w-full mt-4 py-2 rounded-lg bg-earth-500 text-white hover:bg-earth-600 transition-all duration-200"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
