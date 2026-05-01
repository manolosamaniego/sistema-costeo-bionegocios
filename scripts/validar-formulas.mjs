function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, decimals = 2) {
  return Number(num(value).toFixed(decimals));
}

function getVisibleParticipation(values = []) {
  const total = values.reduce((sum, value) => sum + Math.max(0, num(value)), 0);
  if (total <= 0) return values.map(() => 0);
  const scaled = values.map((value, index) => {
    const safe = Math.max(0, num(value));
    const exact = (safe / total) * 100;
    const base = Math.floor(exact * 100) / 100;
    return { index, base, remainder: exact - base };
  });
  let assigned = scaled.reduce((sum, item) => sum + item.base, 0);
  let centsLeft = Math.round((100 - assigned) * 100);
  scaled
    .slice()
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .forEach((item) => {
      if (centsLeft <= 0) return;
      item.base += 0.01;
      centsLeft -= 1;
    });
  const result = Array(values.length).fill(0);
  scaled.forEach((item) => {
    result[item.index] = Number(item.base.toFixed(2));
  });
  return result;
}

function getCertificationComputed({ annualCost, method, usageBase, annualBase }) {
  const safeAnnualCost = num(annualCost);
  const selectedMethod = method || "Por porcentaje del producto";
  const rawUsage = Math.max(0, num(usageBase));
  let rawAnnualBase = Math.max(0, num(annualBase));
  if (selectedMethod === "Por porcentaje del producto") rawAnnualBase = 100;
  const safeUsage = selectedMethod === "Por porcentaje del producto"
    ? Math.min(rawUsage, 100)
    : rawUsage;
  const baseCost = rawAnnualBase > 0 ? safeAnnualCost / rawAnnualBase : 0;
  const assigned = rawAnnualBase > 0 ? safeAnnualCost * (safeUsage / rawAnnualBase) : 0;
  return {
    annualBase: rawAnnualBase,
    safeUsage,
    baseCost: round(baseCost, 4),
    assigned: round(assigned, 4),
  };
}

function getTransformationSummary({ inputQtyBase, outputs }) {
  const normalizedOutputs = outputs.map((item) => ({
    totalBase: round(num(item.qtyOut) * num(item.size), 4),
  }));
  const totalOutputUseful = round(
    normalizedOutputs.reduce((sum, item) => sum + num(item.totalBase), 0),
    4,
  );
  const waste = round(Math.max(0, num(inputQtyBase) - totalOutputUseful), 4);
  const yieldPct = inputQtyBase > 0 ? round((totalOutputUseful / inputQtyBase) * 100, 2) : 0;
  const wastePct = inputQtyBase > 0 ? round((waste / inputQtyBase) * 100, 2) : 0;
  const physicalShares = outputs.map((item) =>
    totalOutputUseful > 0 ? round((num(item.qtyOut) * num(item.size) / totalOutputUseful) * 100, 4) : 0,
  );
  const visibleShares = getVisibleParticipation(
    outputs.map((item) => num(item.qtyOut) * num(item.size)),
  );
  return { totalOutputUseful, waste, yieldPct, wastePct, physicalShares, visibleShares };
}

function getBreakEvenSummary({
  totalCost,
  fixedCosts,
  primarySharePct,
  qtyOut,
  priceNoVat,
  wholesaleMarginPct,
}) {
  const safePrimaryShare = num(primarySharePct) / 100;
  const fixedPrimary = num(fixedCosts) * safePrimaryShare;
  const variableCosts = Math.max(0, num(totalCost) - num(fixedCosts));
  const variablePrimaryTotal = variableCosts * safePrimaryShare;
  const variablePerUnit = num(qtyOut) > 0 ? variablePrimaryTotal / num(qtyOut) : 0;
  const unitCostTotal = num(qtyOut) > 0 ? (num(totalCost) * safePrimaryShare) / num(qtyOut) : 0;
  const contrib = num(priceNoVat) - variablePerUnit;
  const breakEvenUnits = contrib > 0 ? fixedPrimary / contrib : 0;
  const breakEvenSales = breakEvenUnits * num(priceNoVat);
  const wholesalePrice = unitCostTotal * (1 + num(wholesaleMarginPct) / 100);
  return {
    fixedPrimary: round(fixedPrimary, 4),
    variablePerUnit: round(variablePerUnit, 4),
    unitCostTotal: round(unitCostTotal, 4),
    contrib: round(contrib, 4),
    breakEvenUnits: round(breakEvenUnits, 4),
    breakEvenSales: round(breakEvenSales, 4),
    wholesalePrice: round(wholesalePrice, 4),
  };
}

const cases = [
  {
    name: "Participación visible en costos directos",
    expected: [96.75, 1.95, 1.3],
    actual: getVisibleParticipation([280, 5.64, 3.76]),
  },
  {
    name: "Certificación orgánico por porcentaje",
    expected: { assigned: 300, baseCost: 12, annualBase: 100, safeUsage: 25 },
    actual: getCertificationComputed({
      annualCost: 1200,
      method: "Por porcentaje del producto",
      usageBase: 25,
      annualBase: 0,
    }),
  },
  {
    name: "Certificación HACCP por lotes",
    expected: { assigned: 30, baseCost: 15, annualBase: 60, safeUsage: 2 },
    actual: getCertificationComputed({
      annualCost: 900,
      method: "Por lotes del periodo",
      usageBase: 2,
      annualBase: 60,
    }),
  },
  {
    name: "Transformación física con merma",
    expected: {
      totalOutputUseful: 3.6,
      waste: 0.4,
      yieldPct: 90,
      wastePct: 10,
      visibleShares: [83.33, 16.67],
    },
    actual: getTransformationSummary({
      inputQtyBase: 4,
      outputs: [
        { qtyOut: 3, size: 1 },
        { qtyOut: 1, size: 0.6 },
      ],
    }),
  },
  {
    name: "Punto de equilibrio de la salida principal",
    expected: {
      fixedPrimary: 240,
      variablePerUnit: 100,
      unitCostTotal: 160,
      contrib: 50,
      breakEvenUnits: 4.8,
      breakEvenSales: 720,
      wholesalePrice: 176,
    },
    actual: getBreakEvenSummary({
      totalCost: 800,
      fixedCosts: 300,
      primarySharePct: 80,
      qtyOut: 4,
      priceNoVat: 150,
      wholesaleMarginPct: 10,
    }),
  },
];

function compareValues(expected, actual) {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    return expected.length === actual.length && expected.every((value, index) => round(actual[index]) === round(value));
  }
  if (expected && typeof expected === "object") {
    return Object.entries(expected).every(([key, value]) => round(actual[key]) === round(value));
  }
  return round(expected) === round(actual);
}

const results = cases.map((testCase) => ({
  name: testCase.name,
  passed: compareValues(testCase.expected, testCase.actual),
  expected: testCase.expected,
  actual: testCase.actual,
}));

console.log(JSON.stringify(results, null, 2));

if (results.some((item) => !item.passed)) {
  process.exitCode = 1;
}
