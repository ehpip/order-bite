'use client';

import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet, Trash2, X } from 'lucide-react';
import { parseMenuFile } from '@/lib/import/parse-menu-file';
import { MenuImportRow } from '@/lib/types';

interface ImportMenuModalProps {
  opened: boolean;
  onClose: () => void;
  storeId: string;
  onImportSuccess: (rowsCount: number) => void;
}

export default function ImportMenuModal({
  opened,
  onClose,
  storeId,
  onImportSuccess,
}: ImportMenuModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<MenuImportRow[]>([]);

  if (!opened) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setErrorMsg(null);
    setPreviewRows([]);

    if (!selectedFile) return;

    try {
      setLoading(true);
      const rows = await parseMenuFile(selectedFile);
      setPreviewRows(rows);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  };

  const validRowsCount = previewRows.filter((r) => r.isValid).length;
  const invalidRowsCount = previewRows.filter((r) => !r.isValid).length;

  const handleCellChange = (index: number, field: keyof MenuImportRow, value: any) => {
    const updated = [...previewRows];
    const row = { ...updated[index], [field]: value };

    const errors: string[] = [];
    if (!row.name || !String(row.name).trim()) errors.push('Item name is empty');
    if (isNaN(Number(row.price)) || Number(row.price) <= 0) errors.push('Price must be positive');
    if (!row.category || !String(row.category).trim()) errors.push('Category missing');

    row.errors = errors;
    row.isValid = errors.length === 0;

    updated[index] = row;
    setPreviewRows(updated);
  };

  const handleDeleteRow = (index: number) => {
    setPreviewRows(previewRows.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('No valid rows available to import.');
      return;
    }

    try {
      setLoading(true);
      const { db } = await import('@/lib/storage/db-service');
      const result = await db.importMenuItems(
        storeId,
        validRows.map((r) => ({
          name: r.name,
          description: r.description,
          category: r.category,
          price: Number(r.price),
          is_available: r.is_available,
          image_url: r.image_url,
          sku: r.sku,
        }))
      );

      onImportSuccess(result.added);
      onClose();
      setFile(null);
      setPreviewRows([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">
          <FileSpreadsheet className="w-5 h-5 text-orange-600" />
          Import Menu from CSV / Excel
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* File Upload Dropzone */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
            <input
              type="file"
              id="menu-file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="menu-file"
              className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-orange-500 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-colors"
            >
              <Upload className="w-4 h-4 text-orange-600" />
              {file ? file.name : 'Select CSV or Excel file'}
            </label>
            <p className="text-[11px] text-slate-500">
              Columns: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">name</code>,{' '}
              <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">category</code>,{' '}
              <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">price</code>,{' '}
              <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">description</code>
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {errorMsg}
            </div>
          )}

          {/* Validation Badges */}
          {previewRows.length > 0 && (
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {validRowsCount} Valid
                </span>
                {invalidRowsCount > 0 && (
                  <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> {invalidRowsCount} Errors
                  </span>
                )}
              </div>
              <span className="text-slate-500 font-medium">Total: {previewRows.length} items</span>
            </div>
          )}

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="p-2 border-b">Row</th>
                    <th className="p-2 border-b">Item Name</th>
                    <th className="p-2 border-b">Category</th>
                    <th className="p-2 border-b w-24">Price (Rp)</th>
                    <th className="p-2 border-b">Status</th>
                    <th className="p-2 border-b w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className={row.isValid ? '' : 'bg-rose-50/60'}>
                      <td className="p-2 font-mono text-slate-400">{row.rowIndex}</td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleCellChange(idx, 'name', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs outline-hidden ${
                            !row.name ? 'border-rose-400 bg-rose-100' : 'border-slate-200'
                          }`}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.category}
                          onChange={(e) => handleCellChange(idx, 'category', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs outline-hidden ${
                            !row.category ? 'border-rose-400 bg-rose-100' : 'border-slate-200'
                          }`}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          value={row.price}
                          onChange={(e) => handleCellChange(idx, 'price', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs outline-hidden ${
                            !row.price || Number(row.price) <= 0 ? 'border-rose-400 bg-rose-100' : 'border-slate-200'
                          }`}
                        />
                      </td>
                      <td className="p-2">
                        {row.isValid ? (
                          <span className="text-emerald-700 font-bold text-[10px]">Ready</span>
                        ) : (
                          <span className="text-rose-600 font-semibold text-[10px] block leading-tight">
                            {row.errors.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="p-1">
                        <button
                          onClick={() => handleDeleteRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl"
          >
            Cancel
          </button>
          <button
            disabled={validRowsCount === 0 || loading}
            onClick={handleConfirmImport}
            className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl shadow-xs cursor-pointer"
          >
            Confirm Import ({validRowsCount} items)
          </button>
        </div>
      </div>
    </div>
  );
}
