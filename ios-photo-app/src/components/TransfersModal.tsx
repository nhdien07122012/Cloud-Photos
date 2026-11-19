/**
 * TransfersModal.tsx - Quản lý tiến trình tải lên và tải xuống tệp tin
 */

import React from "react";
import type { TransferTask } from "../types";
import {
  ArrowUpDown,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

interface TransfersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TransferTask[];
  onClearCompleted: () => void;
}

export const TransfersModal: React.FC<TransfersModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onClearCompleted,
}) => {
  if (!isOpen) return null;

  const activeCount = tasks.filter((t) => t.status === "running" || t.status === "pending").length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Tiến trình truyền tệp</h3>
              <p className="text-[11px] text-neutral-400">
                {activeCount > 0 ? `Đang xử lý ${activeCount} tệp...` : "Tất cả đã hoàn tất"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {tasks.some((t) => t.status === "completed") && (
              <button
                onClick={onClearCompleted}
                className="px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 font-medium active:opacity-60"
              >
                Xóa đã xong
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 active:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-[160px]">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500">
              <ArrowUpDown className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">Không có tệp nào đang tải lên hoặc tải xuống</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-neutral-800/50 border border-neutral-800 rounded-2xl space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        task.type === "upload"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {task.type === "upload" ? (
                        <UploadCloud className="w-4 h-4" />
                      ) : (
                        <DownloadCloud className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                        {task.name}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {task.sizeFormatted} • {task.type === "upload" ? "Tải lên" : "Tải xuống"}
                        {task.speed && ` • ${task.speed}`}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {task.status === "completed" ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xong</span>
                      </span>
                    ) : task.status === "error" ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Lỗi</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-blue-400">
                        {task.progress}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Thanh tiến trình */}
                {task.status === "running" && (
                  <div className="w-full bg-neutral-700/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
