/**
 * FolderModal.tsx - Hộp thoại tạo thư mục mới & di chuyển tệp
 */

import React, { useState } from "react";
import { FolderPlus, X, Check } from "lucide-react";

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, color?: string) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
}) => {
  const [folderName, setFolderName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");

  if (!isOpen) return null;

  const colors = [
    { key: "blue", bg: "bg-blue-500" },
    { key: "emerald", bg: "bg-emerald-500" },
    { key: "purple", bg: "bg-purple-500" },
    { key: "amber", bg: "bg-amber-500" },
    { key: "rose", bg: "bg-rose-500" },
    { key: "cyan", bg: "bg-cyan-500" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onCreateFolder(folderName.trim(), selectedColor);
    setFolderName("");
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Thư mục mới</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 active:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-400 block mb-1.5">
              Tên thư mục
            </label>
            <input
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ví dụ: Tài liệu học tập, Hợp đồng..."
              className="w-full h-11 px-3.5 bg-neutral-800/80 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-400 block mb-2">
              Màu sắc thư mục
            </label>
            <div className="flex items-center gap-2.5">
              {colors.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedColor(c.key)}
                  className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-transform active:scale-90 ${
                    selectedColor === c.key ? "ring-2 ring-white scale-110" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {selectedColor === c.key && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs disabled:opacity-40 transition-colors shadow-lg shadow-blue-500/20"
            >
              Tạo thư mục
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
