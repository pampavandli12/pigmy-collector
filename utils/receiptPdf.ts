import {
  formatReceiptData,
  type ReceiptData,
} from '@/utils/ReceiptPrinter';

const RECEIPT_WIDTH_POINTS = 227;
const RECEIPT_HORIZONTAL_PADDING = 12;
const RECEIPT_VERTICAL_PADDING = 16;
const RECEIPT_LINE_HEIGHT = 14;

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

export function buildReceiptPdfDocument(data: ReceiptData): ReceiptPdfDocument {
  const receiptText = formatReceiptData(data).trimEnd();
  const lineCount = Math.max(receiptText.split('\n').length, 1);
  const height =
    lineCount * RECEIPT_LINE_HEIGHT + RECEIPT_VERTICAL_PADDING * 2;
  const account = safeFilenamePart(data.accountNo);
  const date = safeFilenamePart(data.date);
  const filename = `receipt-${account}-${date}.pdf`;

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

export async function generateReceiptPdf(data: ReceiptData): Promise<string> {
  const [{ File, Paths }, Print] = await Promise.all([
    import('expo-file-system'),
    import('expo-print'),
  ]);
  const document = buildReceiptPdfDocument(data);
  const result = await Print.printToFileAsync({
    html: document.html,
    width: document.width,
    height: document.height,
  });
  const source = new File(result.uri);
  const destination = new File(Paths.cache, document.filename);

  if (destination.exists) destination.delete();
  source.copy(destination);

  return destination.uri;
}
