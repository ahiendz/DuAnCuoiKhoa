const SCORE_FIELDS_HS1 = [
  "mieng_1",
  "mieng_2",
  "phut15_1",
  "phut15_2",
  "tiet1_1",
  "tiet1_2"
];

function toNullableScore(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100) / 100;
}

function isValidScore(score) {
  if (score === null || score === undefined) return true;
  return Number.isFinite(score) && score >= 0 && score <= 10;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function calculateSemesterAverage(scores = {}) {
  const hs1Values = SCORE_FIELDS_HS1
    .map(field => toNullableScore(scores[field]))
    .filter(v => v !== null);

  const mid = toNullableScore(scores.giuaki);
  const finalExam = toNullableScore(scores.cuoiki);

  const hs1Sum = hs1Values.reduce((acc, value) => acc + value, 0);
  const weightedMid = 2 * (mid ?? 0);
  const weightedFinal = 2 * (finalExam ?? 0);
  const denominator = hs1Values.length + 4;

  if (denominator <= 0) return 0;
  return round2((hs1Sum + weightedMid + weightedFinal) / denominator);
}

module.exports = {
  SCORE_FIELDS_HS1,
  toNullableScore,
  isValidScore,
  calculateSemesterAverage,
  round2
};
