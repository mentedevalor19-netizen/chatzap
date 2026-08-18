import { BadRequestException } from '@nestjs/common';

export function buildDateRange(from?: string, to?: string) {
  const gte = parseOptionalDate(from, 'from', false);
  const lte = parseOptionalDate(to, 'to', true);

  if (!gte && !lte) {
    return undefined;
  }

  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {}),
  };
}

export function cleanOptionalText(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}

export function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

export function parseOptionalDate(value: string | undefined, field: string, endOfDay = false) {
  if (!value) {
    return undefined;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`
    : value;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} date is invalid`);
  }

  return date;
}
