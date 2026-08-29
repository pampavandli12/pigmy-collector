export const GRACE_PERIOD_EXCEEDED_MESSAGE =
  'You are exceeding grace days, please deposit the amount to bank';

export interface GracePeriodResult {
  allowed: boolean;
  deadline: Date | null;
}

function createLocalDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDepositDate(value: string) {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed);
  const dayFirstMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);

  if (isoMatch) {
    return createLocalDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  if (dayFirstMatch) {
    return createLocalDate(
      Number(dayFirstMatch[3]),
      Number(dayFirstMatch[2]),
      Number(dayFirstMatch[1]),
    );
  }

  return null;
}

export function evaluateGracePeriod(
  lastDepositDate: string | null | undefined,
  graceDays: number | null | undefined,
  now = new Date(),
): GracePeriodResult {
  if (
    !lastDepositDate ||
    !Number.isInteger(graceDays) ||
    graceDays === null ||
    graceDays === undefined ||
    graceDays < 0 ||
    !Number.isFinite(now.getTime())
  ) {
    return { allowed: false, deadline: null };
  }

  const depositDate = parseDepositDate(lastDepositDate);

  if (!depositDate) {
    return { allowed: false, deadline: null };
  }

  const deadline = new Date(depositDate);
  deadline.setDate(deadline.getDate() + graceDays);

  const today = createLocalDate(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );

  return {
    allowed: Boolean(today && today.getTime() <= deadline.getTime()),
    deadline,
  };
}
