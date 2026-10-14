import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { MAX_UPLOAD_BYTES } from '@/config/env';

export interface PickedDocument {
  name: string;
  size: number;
  mimeType: string;
  /** Raw base64 without a `data:` prefix, as the API expects. */
  base64: string;
}

export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export class DocumentPickError extends Error {}

const stripDataUrl = (value: string) => value.replace(/^data:[^;]+;base64,/, '');

/** Opens the system picker for a PDF/JPG/PNG and returns it base64-encoded, or null if cancelled. */
export async function pickDocument(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: DOCUMENT_TYPES,
    multiple: false,
    copyToCacheDirectory: true,
    // Web only: read the file as a data URL so it can be sent inline.
    base64: true,
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? guessMime(asset.name);
  if (!DOCUMENT_TYPES.includes(mimeType)) {
    throw new DocumentPickError('Please choose a PDF, JPG or PNG file.');
  }

  let base64: string;
  let size = asset.size ?? 0;
  if (Platform.OS === 'web') {
    base64 = stripDataUrl(asset.base64 ?? '');
  } else {
    const file = new File(asset.uri);
    size = size || file.size;
    if (size > MAX_UPLOAD_BYTES) throw tooLarge();
    base64 = await file.base64();
  }
  if (size > MAX_UPLOAD_BYTES) throw tooLarge();
  if (!base64) throw new DocumentPickError('The selected file could not be read. Please try another file.');

  return { name: sanitizeFileName(asset.name, mimeType), size, mimeType, base64 };
}

function tooLarge() {
  return new DocumentPickError(`File is too large. Maximum size is ${Math.round((MAX_UPLOAD_BYTES / 1024 / 1024) * 10) / 10} MB.`);
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

function sanitizeFileName(name: string, mimeType: string): string {
  const safe = name.replace(/[^\w.\- ]+/g, '_').slice(-80) || 'document';
  if (/\.(pdf|png|jpe?g)$/i.test(safe)) return safe;
  const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg';
  return `${safe}.${ext}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
