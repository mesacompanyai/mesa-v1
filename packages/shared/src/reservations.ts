export type TableAvailabilityRecord = {
  id: string;
  number: number;
  label?: string | null;
  seats: number;
  location?: string | null;
  active?: boolean;
};

export type BlockingReservationRecord = {
  tableId?: string | null;
  status: string;
};

const BLOCKING_RESERVATION_STATUSES = new Set(["confirmed", "seated"]);

export function isReservationStatusBlocking(status: string): boolean {
  return BLOCKING_RESERVATION_STATUSES.has(status);
}

export function normalizeAreaPreference(value?: string | null): "inside" | "outside" | null {
  if (!value) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/\bfora\b|extern|varanda|terraco|jardim/.test(normalized)) return "outside";
  if (/dentro|salao|intern|mezanino|bar/.test(normalized)) return "inside";
  return null;
}

export function selectSmallestAvailableTable(
  tables: TableAvailabilityRecord[],
  blockingReservations: BlockingReservationRecord[],
  partySize: number,
  areaPreference?: string | null,
): TableAvailabilityRecord | null {
  const blockedTableIds = new Set(
    blockingReservations
      .filter((reservation) => reservation.tableId && isReservationStatusBlocking(reservation.status))
      .map((reservation) => reservation.tableId as string),
  );
  const normalizedArea = normalizeAreaPreference(areaPreference);
  const activeTables = tables.filter((table) => table.active !== false && !blockedTableIds.has(table.id) && table.seats >= partySize);
  const preferredTables = normalizedArea ? activeTables.filter((table) => table.location === normalizedArea) : activeTables;
  const candidates = preferredTables.length ? preferredTables : activeTables;

  return [...candidates].sort((a, b) => a.seats - b.seats || a.number - b.number)[0] || null;
}

export function parseReservationStartsAt(date: string, time: string): Date {
  const normalizedDate = date.trim();
  const normalizedTime = time.trim();
  return new Date(`${normalizedDate}T${normalizedTime}:00-03:00`);
}
