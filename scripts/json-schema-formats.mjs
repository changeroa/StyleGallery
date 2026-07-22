import addFormats from "ajv-formats";

const rfc3339DateTime = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isRfc3339DateTime(value) {
  if (typeof value !== "string") return false;
  const match = rfc3339DateTime.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;

  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const hour = Number(match.groups.hour);
  const minute = Number(match.groups.minute);
  const second = Number(match.groups.second);
  const canonical = new Date(0);
  canonical.setUTCFullYear(year, month - 1, day);
  canonical.setUTCHours(hour, minute, second, 0);

  return canonical.getUTCFullYear() === year
    && canonical.getUTCMonth() === month - 1
    && canonical.getUTCDate() === day
    && canonical.getUTCHours() === hour
    && canonical.getUTCMinutes() === minute
    && canonical.getUTCSeconds() === second;
}

export function addDateTimeFormat(ajv) {
  addFormats(ajv, ["date-time"]);
  return ajv;
}
