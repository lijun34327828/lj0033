import { useEffect, useState, useMemo } from "react";
import { useRecordStore } from "@/store";
import { Search, FileText } from "lucide-react";

export default function Records() {
  const { records, fetchRecords } = useRecordStore();
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filtered = useMemo(() => {
    if (!keyword) return records;
    const k = keyword.toLowerCase();
    return records.filter((r) => r.guestName.toLowerCase().includes(k));
  }, [records, keyword]);

  function handleSearch() {
    fetchRecords(keyword || undefined);
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-earth-400" />
          <input
            type="text"
            placeholder="搜索客人姓名"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-3 py-2 border border-earth-200 rounded-lg text-sm focus:outline-none focus:border-earth-400"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg bg-earth-500 text-white text-sm hover:bg-earth-600 transition-all duration-200"
          >
            搜索
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-earth-200 mx-auto mb-3" />
          <p className="text-earth-400">暂无入住记录</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-earth-200" />
          <div className="space-y-4">
            {filtered.map((record) => (
              <div key={record.id} className="relative pl-14">
                <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-earth-500 border-4 border-earth-50" />
                <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-serif text-lg font-semibold text-earth-900">
                      {record.guestName}
                    </h3>
                    <span className="text-earth-500 font-bold">¥{Number(record.actualAmount) || 0}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-earth-400">房源</span>
                      <p className="text-earth-800">{record.propertyName || record.propertyId}</p>
                    </div>
                    <div>
                      <span className="text-earth-400">联系电话</span>
                      <p className="text-earth-800">{record.guestPhone}</p>
                    </div>
                    <div>
                      <span className="text-earth-400">入住</span>
                      <p className="text-earth-800">{record.checkIn}</p>
                    </div>
                    <div>
                      <span className="text-earth-400">退房</span>
                      <p className="text-earth-800">{record.checkOut}</p>
                    </div>
                  </div>
                  {record.extraServices.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-earth-50">
                      <span className="text-xs text-earth-400">增值服务: </span>
                      {record.extraServices.map((s, i) => (
                        <span key={s.id} className="text-xs text-earth-600">
                          {s.name}×{s.quantity}{i < record.extraServices.length - 1 ? "、" : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-earth-300 mt-2">记录时间: {record.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
