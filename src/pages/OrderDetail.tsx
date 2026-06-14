import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useOrderStore } from "@/store";
import { ArrowLeft, X } from "lucide-react";
import type { PenaltyCalculation } from "@/types";

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: "待入住", color: "bg-yellow-100 text-yellow-700" },
  checked_in: { label: "入住中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-500" },
};

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { currentOrder, fetchOrder, cancelOrder, checkIn, completeOrder } = useOrderStore();
  const [cancelModal, setCancelModal] = useState(false);
  const [penalty, setPenalty] = useState<PenaltyCalculation | null>(null);

  useEffect(() => {
    if (orderId) fetchOrder(orderId);
  }, [orderId, fetchOrder]);

  if (!currentOrder) {
    return <div className="text-center py-20 text-earth-400">加载中...</div>;
  }

  const badge = STATUS_BADGES[currentOrder.status] || STATUS_BADGES.pending;

  async function handleCancel() {
    if (!orderId) return;
    const result = await cancelOrder(orderId);
    setPenalty(result);
    setCancelModal(false);
  }

  async function handleCheckIn() {
    if (!orderId) return;
    await checkIn(orderId);
  }

  async function handleComplete() {
    if (!orderId) return;
    await completeOrder(orderId);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/orders")}
        className="flex items-center gap-2 text-earth-500 hover:text-earth-700 mb-6 transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">返回订单列表</span>
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-bold text-earth-900">订单详情</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <span className="text-sm text-earth-400">订单编号</span>
            <p className="text-earth-800 font-mono">{currentOrder.id}</p>
          </div>
          <div>
            <span className="text-sm text-earth-400">房源</span>
            <p className="text-earth-800 font-medium">{currentOrder.propertyName || currentOrder.propertyId}</p>
          </div>
          <div>
            <span className="text-sm text-earth-400">客人姓名</span>
            <p className="text-earth-800">{currentOrder.guestName}</p>
          </div>
          <div>
            <span className="text-sm text-earth-400">联系电话</span>
            <p className="text-earth-800">{currentOrder.guestPhone}</p>
          </div>
          <div>
            <span className="text-sm text-earth-400">入住日期</span>
            <p className="text-earth-800">{currentOrder.checkIn}</p>
          </div>
          <div>
            <span className="text-sm text-earth-400">退房日期</span>
            <p className="text-earth-800">{currentOrder.checkOut}</p>
          </div>
          <div>
            <span className="text-sm text-earth-400">入住人数</span>
            <p className="text-earth-800">{Number(currentOrder.guests) || 0}人</p>
          </div>
          <div>
            <span className="text-sm text-earth-400">订单金额</span>
            <p className="text-earth-500 font-bold text-xl">¥{Number(currentOrder.totalAmount) || 0}</p>
          </div>
        </div>

        {currentOrder.extraServices.length > 0 && (
          <div className="mb-6">
            <span className="text-sm text-earth-400 mb-2 block">增值服务</span>
            <div className="space-y-1">
              {currentOrder.extraServices.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-earth-600">{s.name} × {Number(s.quantity) || 0}</span>
                  <span className="text-earth-800">¥{(Number(s.price) || 0) * (Number(s.quantity) || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-earth-400 border-t border-earth-100 pt-4">
          <span>创建时间: {currentOrder.createdAt}</span>
          <span>更新时间: {currentOrder.updatedAt}</span>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-earth-100">
          {currentOrder.status === "pending" && (
            <>
              <button
                onClick={handleCheckIn}
                className="px-6 py-2.5 rounded-lg bg-forest-500 text-white font-medium hover:bg-forest-600 transition-all duration-200"
              >
                办理入住
              </button>
              <button
                onClick={() => setCancelModal(true)}
                className="px-6 py-2.5 rounded-lg bg-crimson-500 text-white font-medium hover:bg-crimson-600 transition-all duration-200"
              >
                取消订单
              </button>
            </>
          )}
          {currentOrder.status === "checked_in" && (
            <>
              <button
                onClick={handleComplete}
                className="px-6 py-2.5 rounded-lg bg-forest-500 text-white font-medium hover:bg-forest-600 transition-all duration-200"
              >
                办理退房
              </button>
              <Link
                to="/records"
                className="px-6 py-2.5 rounded-lg border border-earth-200 text-earth-600 hover:bg-earth-50 transition-all duration-200"
              >
                查看入住记录
              </Link>
            </>
          )}
        </div>
      </div>

      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-earth-900">确认取消订单</h3>
              <button onClick={() => setCancelModal(false)} className="p-1 rounded-lg hover:bg-earth-50">
                <X className="w-5 h-5 text-earth-400" />
              </button>
            </div>
            <p className="text-sm text-earth-600 mb-4">取消订单可能会产生违约金，确认要取消吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(false)}
                className="flex-1 py-2 rounded-lg border border-earth-200 text-earth-600 hover:bg-earth-50 transition-all duration-200"
              >
                返回
              </button>
              <button
                onClick={handleCancel}
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
