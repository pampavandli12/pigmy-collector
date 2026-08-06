import {
  formatReceiptData,
  type ReceiptData,
} from '@/utils/ReceiptPrinter';

const RECEIPT_WIDTH_POINTS = 227;
const RECEIPT_HORIZONTAL_PADDING = 12;
const RECEIPT_VERTICAL_PADDING = 16;
const RECEIPT_LINE_HEIGHT = 14;
const RECEIPT_CACHE_DIRECTORY = 'whatsapp-receipts';
export const RECEIPT_RETENTION_MS = 24 * 60 * 60 * 1000;
let receiptFileSequence = 0;

interface ReceiptCacheFile {
  modificationTime: number | null;
  delete(): void;
}

export function cleanupExpiredReceiptFiles(
  files: ReceiptCacheFile[],
  now = Date.now(),
): void {
  const expirationTime = now - RECEIPT_RETENTION_MS;
  for (const file of files) {
    if (
      file.modificationTime !== null &&
      file.modificationTime < expirationTime
    ) {
      try {
        file.delete();
      } catch {
        // Stale-file cleanup must never prevent a new receipt from being shared.
      }
    }
  }
}

export function createUniqueReceiptFilename(
  filename: string,
  now = Date.now(),
): string {
  receiptFileSequence = (receiptFileSequence + 1) % Number.MAX_SAFE_INTEGER;
  const basename = filename.replace(/\.pdf$/i, '');
  return `${basename}-${now.toString(36)}-${receiptFileSequence.toString(36)}.pdf`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeFilenamePart(value: unknown): string {
  return String(value ?? 'receipt')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'receipt';
}

export interface ReceiptPdfDocument {
  html: string;
  width: number;
  height: number;
  filename: string;
}

export interface GeneratedReceiptPdf {
  uri: string;
  filename: string;
}

type ExpoFileSystem = typeof import('expo-file-system');
type ExpoPrint = typeof import('expo-print');

export interface ReceiptPdfDependencies {
  Directory: ExpoFileSystem['Directory'];
  File: ExpoFileSystem['File'];
  Paths: Pick<ExpoFileSystem['Paths'], 'cache'>;
  printToFileAsync: ExpoPrint['printToFileAsync'];
}

export function buildReceiptPdfDocument(data: ReceiptData): ReceiptPdfDocument {
  const receiptText = formatReceiptData(data).trimEnd();
  const lineCount = Math.max(receiptText.split('\n').length, 1);
  const height =
    lineCount * RECEIPT_LINE_HEIGHT + RECEIPT_VERTICAL_PADDING * 2;
  const account = safeFilenamePart(data.accountNo);
  const receiptNumber = safeFilenamePart(data.receiptNumber);
  const filename = `receipt-${account}-${receiptNumber}.pdf`;

  return {
    width: RECEIPT_WIDTH_POINTS,
    height,
    filename,
    html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: ${RECEIPT_WIDTH_POINTS}px ${height}px; margin: 0; }
      * { box-sizing: border-box; }
      html, body { width: ${RECEIPT_WIDTH_POINTS}px; margin: 0; padding: 0; }
      body {
        background: #fff;
        color: #000;
        padding: ${RECEIPT_VERTICAL_PADDING}px ${RECEIPT_HORIZONTAL_PADDING}px;
      }
      pre {
        margin: 0;
        white-space: pre;
        font-family: "Courier New", Courier, monospace;
        font-size: 10px;
        line-height: ${RECEIPT_LINE_HEIGHT}px;
        font-weight: 500;
      }
    </style>
  </head>
  <body><pre>${escapeHtml(receiptText)}</pre></body>
</html>`,
  };
}

export async function generateReceiptPdf(
  data: ReceiptData,
  dependencies?: ReceiptPdfDependencies,
): Promise<GeneratedReceiptPdf> {
  const resolvedDependencies: ReceiptPdfDependencies =
    dependencies ??
    (await Promise.all([import('expo-file-system'), import('expo-print')]).then(
      ([fileSystem, print]) => ({
        Directory: fileSystem.Directory,
        File: fileSystem.File,
        Paths: fileSystem.Paths,
        printToFileAsync: print.printToFileAsync,
      }),
    ));
  const { Directory, File, Paths, printToFileAsync } = resolvedDependencies;
  const document = buildReceiptPdfDocument(data);
  const result = await printToFileAsync({
    html: document.html,
    width: document.width,
    height: document.height,
  });
  const source = new File(result.uri);
  if (!source.exists || source.size <= 0) {
    throw new Error('The generated receipt PDF is missing or empty.');
  }

  const receiptDirectory = new Directory(Paths.cache, RECEIPT_CACHE_DIRECTORY);
  if (!receiptDirectory.exists) {
    receiptDirectory.create({ idempotent: true, intermediates: true });
  }

  cleanupExpiredReceiptFiles(
    receiptDirectory
      .list()
      .filter((entry): entry is InstanceType<typeof File> => entry instanceof File),
  );

  const filename = createUniqueReceiptFilename(document.filename);
  const destination = new File(receiptDirectory, filename);

  if (destination.exists) {
    throw new Error('A receipt with this identifier already exists.');
  }
  source.copy(destination);

  if (!destination.exists || destination.size <= 0) {
    throw new Error('The receipt PDF could not be saved for sharing.');
  }

  try {
    source.delete();
  } catch {
    // The source is an Expo Print temporary file and can be reclaimed later.
  }

  return { uri: destination.uri, filename };
}
