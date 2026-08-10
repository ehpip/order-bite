import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { MenuImportRow } from '../types';

export interface ParsedStoreImportResult {
  isFullStoreImport: boolean;
  storeName?: string;
  storeDescription?: string;
  storeImage?: string;
  storeAddress?: string;
  items: MenuImportRow[];
}

/**
 * Parses uploaded JSON, CSV, or Excel (.xlsx / .xls) file into validated import rows
 */
export async function parseMenuFile(file: File): Promise<ParsedStoreImportResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'json') {
    return parseJson(file);
  }

  let rawData: Record<string, any>[] = [];

  if (extension === 'csv') {
    rawData = await parseCsv(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    rawData = await parseExcel(file);
  } else {
    throw new Error('Unsupported file format. Please upload a .json, .csv, .xlsx, or .xls file.');
  }

  const items = validateImportRows(rawData);
  return {
    isFullStoreImport: false,
    items,
  };
}

async function parseJson(file: File): Promise<ParsedStoreImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        let storeName: string | undefined = undefined;
        let storeDescription: string | undefined = undefined;
        let storeImage: string | undefined = undefined;
        let storeAddress: string | undefined = undefined;
        let rawItems: Record<string, any>[] = [];

        if (Array.isArray(json)) {
          rawItems = json;
        } else if (json && typeof json === 'object') {
          storeName = json.name || json.store_name || json.title;
          storeDescription = json.description || json.desc;
          storeImage = json.image || json.cover_image || json.logo || json.image_url;
          storeAddress = json.address;

          if (Array.isArray(json.categories)) {
            for (const cat of json.categories) {
              const catName = cat.name || cat.category_name || 'General';
              if (Array.isArray(cat.items)) {
                for (const item of cat.items) {
                  rawItems.push({
                    ...item,
                    category: item.category || catName,
                  });
                }
              }
            }
          } else if (Array.isArray(json.items)) {
            rawItems = json.items;
          } else if (Array.isArray(json.menu)) {
            rawItems = json.menu;
          } else {
            throw new Error('Invalid JSON structure. Expected a store object with "categories" or "items", or an array of items.');
          }
        } else {
          throw new Error('Invalid JSON content.');
        }

        const items = validateImportRows(rawItems);
        resolve({
          isFullStoreImport: Boolean(storeName),
          storeName: decodeHtmlEntities(storeName || ''),
          storeDescription: decodeHtmlEntities(storeDescription || ''),
          storeImage,
          storeAddress: decodeHtmlEntities(storeAddress || ''),
          items,
        });
      } catch (err: any) {
        reject(new Error(`JSON Parsing failed: ${err.message}`));
      }
    };
    reader.onerror = (err) => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
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

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
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

    const rawName = String(normalizeKey('name') || normalizeKey('item_name') || normalizeKey('item') || '').trim();
    const rawDescription = String(normalizeKey('description') || normalizeKey('desc') || '').trim();
    const rawCategory = String(normalizeKey('category') || normalizeKey('cat') || '').trim();
    const rawPrice = normalizeKey('price') || normalizeKey('cost') || 0;
    const rawAvailable = normalizeKey('is_available') ?? normalizeKey('available');
    const rawImageUrl = String(normalizeKey('image_url') || normalizeKey('image') || normalizeKey('cover_image') || '').trim();
    const rawSku = String(normalizeKey('sku') || '').trim();

    const name = decodeHtmlEntities(rawName);
    const description = decodeHtmlEntities(rawDescription);
    const category = decodeHtmlEntities(rawCategory) || 'General';
    const imageUrl = rawImageUrl;
    const sku = rawSku;

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

    const isAvailableBool =
      rawAvailable === undefined || rawAvailable === null || rawAvailable === ''
        ? true
        : String(rawAvailable).toLowerCase() === 'true' ||
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

