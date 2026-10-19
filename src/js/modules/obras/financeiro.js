export function parseBrazilianMoney(value) {
  const amount = String(value).trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!amount) return Number.NaN;

  if (amount.includes(",")) {
    const parts = amount.split(",");
    if (parts.length !== 2 || !/^\d{1,2}$/.test(parts[1])) {
      return Number.NaN;
    }

    const integerPart = parts[0];
    const hasValidGrouping = /^\d{1,3}(\.\d{3})+$/.test(integerPart);
    if (!/^\d+$/.test(integerPart) && !hasValidGrouping) {
      return Number.NaN;
    }

    return Number(`${integerPart.replace(/\./g, "")}.${parts[1]}`);
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(amount)) {
    return Number(amount.replace(/\./g, ""));
  }

  if (/^\d+(\.\d{1,2})?$/.test(amount)) {
    return Number(amount);
  }

  return Number.NaN;
}

export function summarizeWork(contractValue, received, spent) {
  if (
    !Number.isFinite(contractValue) ||
    !Number.isFinite(received) ||
    !Number.isFinite(spent) ||
    contractValue <= 0 ||
    received < 0 ||
    spent < 0
  ) {
    throw new Error("Os valores financeiros da obra são inválidos.");
  }

  return {
    remainingToReceive: Math.max(contractValue - received, 0),
    cashBalance: received - spent,
    notYetSpent: Math.max(contractValue - spent, 0),
    chartedSpent: Math.min(spent, contractValue),
    spentShare: Math.min((spent / contractValue) * 100, 100),
    overBudget: Math.max(spent - contractValue, 0),
    overReceived: Math.max(received - contractValue, 0),
  };
}
