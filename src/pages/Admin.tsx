import { useEffect, useState } from "react";
import { usePropertyStore, useAdminStore } from "@/store";
import { DollarSign, Percent, TrendingUp, Plus, X } from "lucide-react";

const TABS = [
  { value: "property", label: "房源管理" },
  { value: "cleaning", label: "保洁安排" },
  { value: "revenue", label: "营收统计" },
];

const CLEANING_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "待保洁", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "保洁中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState("property");
  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex gap-1">
          {TABS.map((tab) => (
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
      </div>
      {activeTab === "property" && <PropertySection />}
      {activeTab === "cleaning" && <CleaningSection />}
      {activeTab === "revenue" && <RevenueSection />}
    </div>
  );
}

function PropertySection() {
  const { properties, fetchProperties, updatePropertyStatus, addBlackout } = usePropertyStore();
  const [blackoutModal, setBlackoutModal] = useState<string | null>(null);
  const [blackoutStart, setBlackoutStart] = useState("");
  const [blackoutEnd, setBlackoutEnd] = useState("");

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  function handleBlackout() {
    if (!blackoutModal || !blackoutStart || !blackoutEnd) return;
    addBlackout(blackoutModal, blackoutStart, blackoutEnd);
    setBlackoutModal(null);
    setBlackoutStart("");
    setBlackoutEnd("");
  }

  return (
    <div className="space-y-3">
      {properties.map((p) => (
        <div key={p.id} className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-semibold text-earth-900">{p.name}</h3>
              <span className="text-sm text-earth-400">{p.zone} · {p.type === "entire" ? "整租" : "单间"}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updatePropertyStatus(p.id, p.status === "available" ? "maintenance" : "available")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  p.status === "available"
                    ? "bg-forest-500 text-white hover:bg-forest-600"
                    : "bg-gray-400 text-white hover:bg-gray-500"
                }`}
              >
                {p.status === "available" ? "可订" : "维护中"}
              </button>
              <button
                onClick={() => setBlackoutModal(p.id)}
                className="px-4 py-1.5 rounded-lg border border-earth-200 text-earth-600 text-sm hover:bg-earth-50 transition-all duration-200"
              >
                设置黑名单日期
              </button>
            </div>
          </div>
        </div>
      ))}
      {blackoutModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-earth-900">设置黑名单日期</h3>
              <button onClick={() => setBlackoutModal(null)} className="p-1 rounded-lg hover:bg-earth-50">
                <X className="w-5 h-5 text-earth-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-earth-500">开始日期</label>
                <input
                  type="date"
                  value={blackoutStart}
                  onChange={(e) => setBlackoutStart(e.target.value)}
                  className="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
                />
              </div>
              <div>
                <label className="text-sm text-earth-500">结束日期</label>
                <input
                  type="date"
                  value={blackoutEnd}
                  onChange={(e) => setBlackoutEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setBlackoutModal(null)}
                className="flex-1 py-2 rounded-lg border border-earth-200 text-earth-600 hover:bg-earth-50 transition-all duration-200"
              >
                取消
              </button>
              <button
                onClick={handleBlackout}
                className="flex-1 py-2 rounded-lg bg-earth-500 text-white hover:bg-earth-600 transition-all duration-200"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CleaningSection() {
  const { cleaningTasks, fetchCleaningTasks, createCleaningTask, updateCleaningTaskStatus } = useAdminStore();
  const [showForm, setShowForm] = useState(false);
  const [formPropertyId, setFormPropertyId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formAssignee, setFormAssignee] = useState("");

  useEffect(() => {
    fetchCleaningTasks();
  }, [fetchCleaningTasks]);

  async function handleCreate() {
    if (!formPropertyId || !formDate || !formAssignee) return;
    await createCleaningTask({
      propertyId: formPropertyId,
      scheduledDate: formDate,
      assignee: formAssignee,
    });
    setShowForm(false);
    setFormPropertyId("");
    setFormDate("");
    setFormAssignee("");
    fetchCleaningTasks();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-earth-500 text-white text-sm hover:bg-earth-600 transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> 新建保洁任务
        </button>
      </div>
      <div className="space-y-3">
        {cleaningTasks.map((task) => {
          const status = CLEANING_STATUS[task.status] || CLEANING_STATUS.pending;
          return (
            <div key={task.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-earth-900">{task.propertyName || task.propertyId}</h3>
                  <span className="text-sm text-earth-400">
                    日期: {task.scheduledDate} · 人员: {task.assignee}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  {task.status !== "completed" && (
                    <button
                      onClick={() => updateCleaningTaskStatus(task.id)}
                      className="px-3 py-1 rounded-lg border border-earth-200 text-earth-600 text-sm hover:bg-earth-50 transition-all duration-200"
                    >
                      {task.status === "pending" ? "开始保洁" : "完成保洁"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {cleaningTasks.length === 0 && (
          <div className="text-center py-12 text-earth-400">暂无保洁任务</div>
        )}
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-earth-900">新建保洁任务</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-earth-50">
                <X className="w-5 h-5 text-earth-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-earth-500">房源ID</label>
                <input
                  type="text"
                  value={formPropertyId}
                  onChange={(e) => setFormPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
                />
              </div>
              <div>
                <label className="text-sm text-earth-500">日期</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
                />
              </div>
              <div>
                <label className="text-sm text-earth-500">保洁人员</label>
                <input
                  type="text"
                  value={formAssignee}
                  onChange={(e) => setFormAssignee(e.target.value)}
                  className="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-lg border border-earth-200 text-earth-600 hover:bg-earth-50 transition-all duration-200"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2 rounded-lg bg-earth-500 text-white hover:bg-earth-600 transition-all duration-200"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueSection() {
  const { revenueStats, fetchRevenueStats } = useAdminStore();
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetchRevenueStats(period);
  }, [period, fetchRevenueStats]);

  const maxRevenue = revenueStats?.monthlyRevenue?.length
    ? Math.max(...revenueStats.monthlyRevenue.map((m) => m.revenue))
    : 1;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-earth-100">
              <DollarSign className="w-5 h-5 text-earth-500" />
            </div>
            <div>
              <p className="text-sm text-earth-400">总营收</p>
              <p className="text-2xl font-bold text-earth-900">¥{(revenueStats?.totalRevenue ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-forest-500/10">
              <Percent className="w-5 h-5 text-forest-500" />
            </div>
            <div>
              <p className="text-sm text-earth-400">入住率</p>
              <p className="text-2xl font-bold text-earth-900">{(revenueStats?.occupancyRate ?? 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-crimson-500/10">
              <TrendingUp className="w-5 h-5 text-crimson-500" />
            </div>
            <div>
              <p className="text-sm text-earth-400">平均房价</p>
              <p className="text-2xl font-bold text-earth-900">¥{(revenueStats?.avgPrice ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-earth-900">月度营收</h3>
          <div className="flex gap-1">
            {[
              { value: "month", label: "月" },
              { value: "quarter", label: "季" },
              { value: "year", label: "年" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                  period === p.value
                    ? "bg-earth-500 text-white"
                    : "bg-earth-50 text-earth-600 hover:bg-earth-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2 h-48">
          {revenueStats?.monthlyRevenue?.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-earth-400 rounded-t-md transition-all duration-200 hover:bg-earth-500"
                style={{ height: `${((m.revenue ?? 0) / maxRevenue) * 100}%`, minHeight: "4px" }}
              />
              <span className="text-xs text-earth-400 mt-1">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-serif text-lg font-semibold text-earth-900 mb-4">房源营收排行</h3>
        <div className="space-y-3">
          {revenueStats?.topProperties?.map((prop, i) => (
            <div key={prop.id} className="flex items-center justify-between p-3 rounded-lg bg-earth-50">
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-earth-500 text-white" : "bg-earth-200 text-earth-600"
                }`}>
                  {i + 1}
                </span>
                <span className="text-earth-800 font-medium">{prop.name}</span>
              </div>
              <div className="text-right">
                <span className="text-earth-500 font-bold">¥{(prop.revenue ?? 0).toLocaleString()}</span>
                <span className="text-xs text-earth-400 ml-2">{prop.bookings || 0}单</span>
              </div>
            </div>
          ))}
          {(!revenueStats?.topProperties || revenueStats.topProperties.length === 0) && (
            <div className="text-center py-8 text-earth-400">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
