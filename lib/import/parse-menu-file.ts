import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { MenuImportRow } from '../types';

/**
 * Parses uploaded CSV or Excel (.xlsx / .xls) file into validated import rows
 */
export async function parseMenuFile(file: File): Promise<MenuImportRow[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  let rawData: Record<string, any>[] = [];

  if (extension === 'csv') {
    rawData = await parseCsv(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    rawData = await parseExcel(file);
  } else {
    throw new Error('Unsupported file format. Please upload a .csv, .xlsx, or .xls file.');
  }

  return validateImportRows(rawData);
}

function parseCsv(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as Record<string, any>[]);
      },
      error: (err) => {
        reject(new Error(`CSV Parsing failed: ${err.message}`));
      },
    });
  });
}

function parseExcel(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
        resolve(json);
      } catch (err: any) {
        reject(new Error(`Excel Parsing failed: ${err.message}`));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

/**
 * Normalizes keys and validates data for each row
 */
export function validateImportRows(rows: Record<string, any>[]): MenuImportRow[] {
  return rows.map((raw, index) => {
    const normalizeKey = (keyName: string): any => {
      const keys = Object.keys(raw);
      const matched = keys.find((k) => k.trim().toLowerCase() === keyName.toLowerCase());
      return matched ? raw[matched] : undefined;
    };

    const name = String(normalizeKey('name') || normalizeKey('item_name') || normalizeKey('item') || '').trim();
    const description = String(normalizeKey('description') || normalizeKey('desc') || '').trim();
    const category = String(normalizeKey('category') || normalizeKey('cat') || '').trim();
    const rawPrice = normalizeKey('price') || normalizeKey('cost') || 0;
    const rawAvailable = normalizeKey('is_available') ?? normalizeKey('available') ?? true;
    const imageUrl = String(normalizeKey('image_url') || normalizeKey('image') || '').trim();
    const sku = String(normalizeKey('sku') || '').trim();

    const errors: string[] = [];

    // Validation rules
    if (!name) {
      errors.push('Item name is empty');
    }

    // Clean price string e.g. "Rp 45.000" or "45000"
    let parsedPrice = 0;
    if (typeof rawPrice === 'number') {
      parsedPrice = rawPrice;
    } else {
      const cleaned = String(rawPrice).replace(/[^0-9]/g, '');
      parsedPrice = parseInt(cleaned, 10) || 0;
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      errors.push('Price must be a positive number');
    }

    if (!category) {
      errors.push('Category is missing');
    }

    const isAvailableBool =
      String(rawAvailable).toLowerCase() === 'true' ||
      String(rawAvailable) === '1' ||
      rawAvailable === true;

    return {
      rowIndex: index + 1,
      name,
      description,
      category,
      price: parsedPrice,
      is_available: isAvailableBool,
      image_url: imageUrl,
      sku,
      isValid: errors.length === 0,
      errors,
    };
  });
}
