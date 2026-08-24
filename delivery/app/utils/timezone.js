const moment = require("moment-timezone");
const { TIMEZONE } = require("../constants/delivery");

function ubDayRange(startDateStr, endDateStr) {
  const start = moment.tz(startDateStr, TIMEZONE).startOf("day").toDate();
  const end = moment.tz(endDateStr, TIMEZONE).endOf("day").toDate();
  return { start, end };
}

function ubTodayRange() {
  return {
    start: moment.tz(TIMEZONE).startOf("day").toDate(),
    end: moment.tz(TIMEZONE).endOf("day").toDate(),
  };
}

function toDateKey(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function isYmd(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

module.exports = {
  TIMEZONE,
  ubDayRange,
  ubTodayRange,
  toDateKey,
  isYmd,
};
