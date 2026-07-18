export const RECEIPT_CHAR_WIDTH = 32;
export const RECEIPT_SEPARATOR = '-'.repeat(RECEIPT_CHAR_WIDTH);
export const RECEIPT_TRAILING_FEED_LINES = 3;

export type ReceiptAmount = number | string | null | undefined;

export interface BankReceiptData {
  bankName?: string | null;
  receiptTitle?: string | null;
  date?: string | Date | null;
  time?: string | null;
  customerName?: string | null;
  accountNo?: string | number | null;
  accountOpeningDate?: string | Date | null;
  openingBalance?: ReceiptAmount;
  receivedAmount?: ReceiptAmount;
  totalBalance?: ReceiptAmount;
  amountInWords?: string | null;
  collectorName?: string | null;
  collectorPhone?: string | number | null;
}

export interface ReceiptFormatOptions {
  width?: number;
  trailingFeedLines?: number;
}

const ELLIPSIS = '...';
const INDENT = '  ';

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';

  const text = String(value).replace(/\s+/g, ' ').trim();
  if (['undefined', 'null', 'NaN'].includes(text)) return '';

  return text;
}

function normalizeDate(value: string | Date | null | undefined): string {
  if (!value) return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';

    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return cleanText(value);
}

function normalizeTime(date: string | Date | null | undefined, time?: string | null): string {
  const explicitTime = cleanText(time);
  if (explicitTime) return explicitTime;

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function toFiniteNumber(value: ReceiptAmount): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = cleanText(value);
  if (!text) return null;

  const normalized = text.replace(/[₹,\s]/g, '').replace(/^Rs\./i, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatIndianNumber(value: number): string {
  const sign = value < 0 ? '-' : '';
  const fixed = Math.abs(value).toFixed(2);
  const [whole, decimal] = fixed.split('.');

  if (whole.length <= 3) {
    return `${sign}${whole}.${decimal}`;
  }

  const lastThree = whole.slice(-3);
  const leading = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${sign}${leading},${lastThree}.${decimal}`;
}

const BELOW_TWENTY = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function wordsBelowThousand(value: number): string {
  const words: string[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;

  if (hundreds) {
    words.push(BELOW_TWENTY[hundreds], 'Hundred');
  }

  if (remainder >= 20) {
    words.push(TENS[Math.floor(remainder / 10)]);
    if (remainder % 10) words.push(BELOW_TWENTY[remainder % 10]);
  } else if (remainder > 0) {
    words.push(BELOW_TWENTY[remainder]);
  }

  return words.join(' ');
}

export function amountToWords(value: ReceiptAmount): string {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < 0) return '';

  const rupees = Math.floor(parsed);
  const paise = Math.round((parsed - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remainder = rupees % 1000;

  if (crore) parts.push(wordsBelowThousand(crore), 'Crore');
  if (lakh) parts.push(wordsBelowThousand(lakh), 'Lakh');
  if (thousand) parts.push(wordsBelowThousand(thousand), 'Thousand');
  if (remainder) parts.push(wordsBelowThousand(remainder));

  const rupeeWords = parts.join(' ') || 'Zero';
  if (paise) {
    return `${rupeeWords} Rupees ${wordsBelowThousand(paise)} Paise Only`;
  }

  return `${rupeeWords} Rupees Only`;
}

export function formatReceiptAmount(value: ReceiptAmount): string {
  const parsed = toFiniteNumber(value);

  if (parsed === null) return '';

  return `Rs. ${formatIndianNumber(parsed)}`;
}

function truncateToWidth(text: string, width: number): string {
  if (text.length <= width) return text;
  if (width <= ELLIPSIS.length) return text.slice(0, width);

  return `${text.slice(0, width - ELLIPSIS.length)}${ELLIPSIS}`;
}

function centerText(text: string, width: number): string {
  const clean = truncateToWidth(cleanText(text), width);
  const padding = Math.max(width - clean.length, 0);
  const left = Math.floor(padding / 2);
  const right = padding - left;

  return `${' '.repeat(left)}${clean}${' '.repeat(right)}`;
}

function wrapText(text: string, width: number, maxLines?: number): string[] {
  const clean = cleanText(text);
  if (!clean || width <= 0) return [];

  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }

      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  if (!maxLines || lines.length <= maxLines) return lines;

  const limited = lines.slice(0, maxLines);
  limited[maxLines - 1] = truncateToWidth(
    [limited[maxLines - 1], ...lines.slice(maxLines)].join(' '),
    width,
  );

  return limited;
}

function addCenteredWrapped(
  lines: string[],
  value: unknown,
  width: number,
  maxLines: number,
) {
  wrapText(cleanText(value), width, maxLines).forEach((line) => {
    lines.push(centerText(line, width));
  });
}

function addLabelValue(lines: string[], label: string, value: unknown, width: number) {
  const clean = cleanText(value);
  if (!clean) return;

  const prefix = `${label}: `;
  if (prefix.length + clean.length <= width) {
    lines.push(`${prefix}${clean}`);
    return;
  }

  lines.push(label);
  wrapText(clean, width - INDENT.length, 2).forEach((line) => {
    lines.push(`${INDENT}${line}`);
  });
}

function addAmountLine(lines: string[], label: string, value: ReceiptAmount, width: number) {
  const amount = formatReceiptAmount(value);
  if (!amount) return;

  const prefix = `${label}:`;
  const spaces = Math.max(width - prefix.length - amount.length, 1);
  const line = `${prefix}${' '.repeat(spaces)}${amount}`;

  if (line.length <= width) {
    lines.push(line);
    return;
  }

  lines.push(prefix);
  lines.push(amount.padStart(width));
}

function addAmountInWords(lines: string[], amountInWords: unknown, width: number) {
  const clean = cleanText(amountInWords);
  if (!clean) return;

  lines.push('Amount in words:');
  wrapText(clean, width - INDENT.length).forEach((line) => {
    lines.push(`${INDENT}${line}`);
  });
}

function addDateTimeLine(
  lines: string[],
  date: string | Date | null | undefined,
  time: string | null | undefined,
  width: number,
) {
  const formattedDate = normalizeDate(date);
  const formattedTime = normalizeTime(date, time);
  const dateText = formattedDate ? `Date:${formattedDate}` : '';
  const timeText = formattedTime ? `Time:${formattedTime}` : '';

  if (dateText && timeText) {
    const spaces = Math.max(width - dateText.length - timeText.length, 1);
    lines.push(`${dateText}${' '.repeat(spaces)}${timeText}`);
    return;
  }

  if (dateText) lines.push(dateText);
  if (timeText) lines.push(timeText);
}

function ensureSafeLines(lines: string[], width: number): string[] {
  return lines.flatMap((line) => {
    if (line.length <= width) return line;
    return wrapText(line, width);
  });
}

export function formatBankReceipt(
  data: BankReceiptData,
  options: ReceiptFormatOptions = {},
): string {
  const width = options.width ?? RECEIPT_CHAR_WIDTH;
  const trailingFeedLines = options.trailingFeedLines ?? RECEIPT_TRAILING_FEED_LINES;
  const lines: string[] = [];

  addCenteredWrapped(lines, data.bankName, width, 2);
  lines.push(centerText(cleanText(data.receiptTitle) || 'Receipt', width));
  lines.push(RECEIPT_SEPARATOR.slice(0, width));

  addDateTimeLine(lines, data.date, data.time, width);
  addLabelValue(lines, 'Customer', data.customerName, width);
  addLabelValue(lines, 'Account No', data.accountNo, width);
  addLabelValue(lines, 'Opened On', normalizeDate(data.accountOpeningDate), width);
  addAmountLine(lines, 'Opening Bal', data.openingBalance, width);
  addAmountLine(lines, 'Received', data.receivedAmount, width);
  lines.push(RECEIPT_SEPARATOR.slice(0, width));
  addAmountLine(lines, 'Total Bal', data.totalBalance, width);
  addAmountInWords(lines, data.amountInWords, width);
  addLabelValue(lines, 'Collector', data.collectorName, width);
  addLabelValue(lines, 'Phone', data.collectorPhone, width);
  lines.push(RECEIPT_SEPARATOR.slice(0, width));
  lines.push(centerText('Thank You', width));

  return `${ensureSafeLines(lines, width).join('\n')}${'\n'.repeat(trailingFeedLines)}`;
}
