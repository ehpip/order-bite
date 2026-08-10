'use client';

import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet, Trash2, X, Store as StoreIcon, Sparkles } from 'lucide-react';
import { parseMenuFile, ParsedStoreImportResult } from '@/lib/import/parse-menu-file';
import { MenuImportRow } from '@/lib/types';

interface ImportMenuModalProps {
  opened: boolean;
  onClose: () => void;
  storeId?: string; // Optional: if provided, import into existing store
  storeName?: string;
  onImportSuccess: (result: { storeId?: string; storeName?: string; rowsCount: number }) => void;
}

export default function ImportMenuModal({
  opened,
  onClose,
  storeId: propStoreId,
  storeName: propStoreName,
  onImportSuccess,
}: ImportMenuModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<MenuImportRow[]>([]);

  // Store metadata state
  const [isFullStoreImport, setIsFullStoreImport] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState('');
  const [storeDescriptionInput, setStoreDescriptionInput] = useState('');
  const [storeAddressInput, setStoreAddressInput] = useState('');
  const [storeImageInput, setStoreImageInput] = useState('');

  if (!opened) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setErrorMsg(null);
    setPreviewRows([]);

    if (!selectedFile) return;

    try {
      setLoading(true);
      const parsed: ParsedStoreImportResult = await parseMenuFile(selectedFile);
      setPreviewRows(parsed.items);
      setIsFullStoreImport(parsed.isFullStoreImport || !propStoreId);

      if (parsed.storeName) setStoreNameInput(parsed.storeName);
      if (parsed.storeDescription) setStoreDescriptionInput(parsed.storeDescription);
      if (parsed.storeAddress) setStoreAddressInput(parsed.storeAddress);
      if (parsed.storeImage) setStoreImageInput(parsed.storeImage);
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

      const mappedRows = validRows.map((r) => ({
        name: r.name,
        description: r.description,
        category: r.category || 'General',
        price: Number(r.price),
        is_available: r.is_available,
        image_url: r.image_url,
        sku: r.sku,
      }));

      // Import into existing store vs create new store
      if (propStoreId && !isFullStoreImport) {
        const result = await db.importMenuItems(propStoreId, mappedRows);
        onImportSuccess({ storeId: propStoreId, storeName: propStoreName, rowsCount: result.added });
      } else {
        const targetStoreName =
          storeNameInput.trim() ||
          propStoreName ||
          (file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'Imported Store');

        const result = await db.importFullStore(
          {
            name: targetStoreName,
            description: storeDescriptionInput.trim(),
            address: storeAddressInput.trim(),
            cover_image: storeImageInput.trim(),
            logo: storeImageInput.trim(),
          },
          mappedRows
        );

        onImportSuccess({
          storeId: result.store.id,
          storeName: result.store.name,
          rowsCount: result.addedItemsCount,
        });
      }

      onClose();
      setFile(null);
      setPreviewRows([]);
      setStoreNameInput('');
      setStoreDescriptionInput('');
      setStoreAddressInput('');
      setStoreImageInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">
          <FileSpreadsheet className="w-5 h-5 text-orange-600" />
          {propStoreId && !isFullStoreImport ? 'Import Menu to Store' : 'Import Store & Menu (JSON / CSV)'}
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* File Upload Dropzone */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
            <input
              type="file"
              id="menu-file"
              accept=".json, .csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="menu-file"
              className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-orange-500 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-colors"
            >
              <Upload className="w-4 h-4 text-orange-600" />
              {file ? file.name : 'Select JSON, CSV, or Excel file'}
            </label>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
              <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-800 font-mono font-medium">.json</span>
              <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-800 font-mono font-medium">.csv</span>
              <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-800 font-mono font-medium">.xlsx</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Supports full store JSON (with nested categories and items) or CSV item tables.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {errorMsg}
            </div>
          )}

          {/* New Store Details Form (shown when creating a store or when JSON contains store info) */}
          {(isFullStoreImport || !propStoreId) && previewRows.length > 0 && (
            <div className="bg-orange-50/60 border border-orange-200 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 font-bold text-orange-950 text-xs uppercase tracking-wider">
                <StoreIcon className="w-4 h-4 text-orange-600" /> Store Profile Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store Name *</label>
                  <input
                    type="text"
                    value={storeNameInput}
                    onChange={(e) => setStoreNameInput(e.target.value)}
                    placeholder="e.g. Point Coffee, Indomaret Jaksa"
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl outline-hidden focus:border-orange-500 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={storeAddressInput}
                    onChange={(e) => setStoreAddressInput(e.target.value)}
                    placeholder="e.g. Jl. Jaksa No. 18, Jakarta"
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl outline-hidden focus:border-orange-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={storeDescriptionInput}
                    onChange={(e) => setStoreDescriptionInput(e.target.value)}
                    placeholder="e.g. Coffee & Bakery"
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl outline-hidden focus:border-orange-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cover / Logo Image URL</label>
                  <input
                    type="text"
                    value={storeImageInput}
                    onChange={(e) => setStoreImageInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl outline-hidden focus:border-orange-500 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Validation Badges */}
          {previewRows.length > 0 && (
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {validRowsCount} Valid Items
                </span>
                {invalidRowsCount > 0 && (
                  <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> {invalidRowsCount} Errors
                  </span>
                )}
              </div>
              <span className="text-slate-500 font-medium">Total: {previewRows.length} items parsed</span>
            </div>
          )}

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="p-2 border-b">Row</th>
                    <th className="p-2 border-b">Item Name</th>
                    <th className="p-2 border-b">Category</th>
                    <th className="p-2 border-b w-24">Price (Rp)</th>
                    <th className="p-2 border-b">Availability</th>
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
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-hidden"
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
                        {row.is_available ? (
                          <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Available
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Sold Out
                          </span>
                        )}
                      </td>
                      <td className="p-1">
                        <button
                          onClick={() => handleDeleteRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
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
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={validRowsCount === 0 || loading}
            onClick={handleConfirmImport}
            className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {propStoreId && !isFullStoreImport
              ? `Confirm Import (${validRowsCount} items)`
              : `Create Store & Import (${validRowsCount} items)`}
          </button>
        </div>
      </div>
    </div>
  );
}

