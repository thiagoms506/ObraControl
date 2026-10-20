import { parseBrazilianMoney } from "../obras/financeiro.js";
import {
  getReceivedByWork,
  getReceiptStorageState,
} from "../obras/recebimentos.js";
import {
  readStoredArray,
  readWorksSnapshot,
  writeStoredArray,
} from "../obras/armazenamento.js";

const EXPENSES_KEY = "obracontrol.despesas.v1";
const RECEIPTS_KEY = "obracontrol.recebimentos.v1";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const categoryNames = {
  funcionarios: "Funcionários",
  combustivel: "Combustível",
  ferramentas: "Ferramentas",
  materiais: "Materiais",
  transporte: "Transporte e frete",
  "aluguel-equipamentos": "Aluguel de equipamentos",
  servicos: "Serviços terceirizados",
  alimentacao: "Alimentação",
  taxas: "Taxas e impostos",
  "gastos-gerais": "Gastos gerais",
  "gastos-anteriores": "Gastos anteriores",
};

function readWorks() {
  return readWorksSnapshot().works;
}

function isValidExpense(expense) {
  return Boolean(
    expense &&
    typeof expense === "object" &&
    !Array.isArray(expense) &&
    typeof expense.id === "string" &&
    expense.id.trim() &&
    typeof expense.workId === "string" &&
    expense.workId.trim() &&
    Number.isFinite(Number(expense.amount)) &&
    Number(expense.amount) >= 0,
  );
}

function readExpensesSnapshot() {
  const snapshot = readStoredArray(EXPENSES_KEY);
  if (!snapshot.ok)
    return { ...snapshot, validRecords: [], invalidRecords: [] };
  const validRecords = snapshot.records.filter(isValidExpense);
  return {
    ...snapshot,
    validRecords,
    invalidRecords: snapshot.records.filter(
      (expense) => !isValidExpense(expense),
    ),
  };
}

export function readExpenses() {
  return readExpensesSnapshot().validRecords;
}

export function getExpensesStorageState() {
  return readExpensesSnapshot();
}

export function deleteWorkAndExpenses(workId) {
  const worksSnapshot = readWorksSnapshot();
  const expensesSnapshot = readExpensesSnapshot();
  const receiptsSnapshot = readStoredArray(RECEIPTS_KEY);
  if (!worksSnapshot.ok || !expensesSnapshot.ok || !receiptsSnapshot.ok) {
    return false;
  }
  const updatedWorks = worksSnapshot.records.filter(
    (work) => !work || work.id !== workId,
  );
  const updatedExpenses = expensesSnapshot.records.filter(
    (expense) => !isValidExpense(expense) || expense.workId !== workId,
  );
  const updatedReceipts = receiptsSnapshot.records.filter(
    (receipt) =>
      !(
        receipt &&
        typeof receipt === "object" &&
        !Array.isArray(receipt) &&
        typeof receipt.id === "string" &&
        receipt.id.trim() &&
        typeof receipt.workId === "string" &&
        receipt.workId.trim() &&
        Number.isFinite(Number(receipt.amount)) &&
        Number(receipt.amount) > 0
      ) || receipt.workId !== workId,
  );

  if (updatedWorks.length === worksSnapshot.records.length) return false;

  const attemptedWrites = [];
  try {
    for (const [snapshot, records] of [
      [worksSnapshot, updatedWorks],
      [expensesSnapshot, updatedExpenses],
      [receiptsSnapshot, updatedReceipts],
    ]) {
      if (!writeStoredArray(snapshot, records)) {
        throw new Error("Stored data changed while deleting the work.");
      }
      attemptedWrites.push([snapshot, JSON.stringify(records)]);
    }
    return true;
  } catch {
    for (const [snapshot, writtenValue] of attemptedWrites.reverse()) {
      try {
        if (localStorage.getItem(snapshot.key) !== writtenValue) continue;
        if (snapshot.rawValue === null) localStorage.removeItem(snapshot.key);
        else localStorage.setItem(snapshot.key, snapshot.rawValue);
      } catch {
        // The caller reports failure; never overwrite a value changed elsewhere.
      }
    }
    return false;
  }
}

function migrateOldWorkExpenses() {
  const worksSnapshot = readWorksSnapshot();
  const expensesSnapshot = readExpensesSnapshot();
  if (!worksSnapshot.ok || !expensesSnapshot.ok) return false;
  const works = worksSnapshot.works;
  const expenses = [...expensesSnapshot.validRecords];
  const migratedWorkIds = new Set(
    expenses
      .filter((expense) => expense.source === "initial-work-value")
      .map((expense) => expense.workId),
  );
  let expensesChanged = false;

  for (const work of works) {
    const oldAmount = Number(work.spent) || 0;
    if (oldAmount <= 0 || migratedWorkIds.has(work.id)) continue;

    expenses.push({
      id: `initial-spent-${work.id}`,
      workId: work.id,
      category: "gastos-anteriores",
      description: "Gastos anteriores sem detalhamento",
      amount: oldAmount,
      date: "",
      source: "initial-work-value",
      createdAt: new Date().toISOString(),
    });
    migratedWorkIds.add(work.id);
    expensesChanged = true;
  }

  if (expensesChanged) {
    const newlyMigrated = expenses.filter(
      (expense) =>
        !expensesSnapshot.records.some((saved) => saved?.id === expense.id),
    );
    const updatedExpenses = [...expensesSnapshot.records, ...newlyMigrated];
    if (!writeStoredArray(expensesSnapshot, updatedExpenses)) return false;
  }

  const worksToUpdate = works.filter(
    (work) => Number(work.spent) > 0 && migratedWorkIds.has(work.id),
  );
  if (worksToUpdate.length === 0) return true;

  const workIdsToClear = new Set(worksToUpdate.map((work) => work.id));
  const updatedWorks = worksSnapshot.records.map((work) =>
    work && workIdsToClear.has(work.id) ? { ...work, spent: 0 } : work,
  );
  return writeStoredArray(worksSnapshot, updatedWorks);
}

export function getExpensesByWork() {
  const totals = new Map();
  const expenses = readExpenses();

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount) || amount < 0) continue;
    totals.set(expense.workId, (totals.get(expense.workId) || 0) + amount);
  }

  // Keep the old value visible if storage prevented the one-time migration.
  const migratedWorkIds = new Set(
    expenses
      .filter((expense) => expense.source === "initial-work-value")
      .map((expense) => expense.workId),
  );
  for (const work of readWorks()) {
    const oldAmount = Number(work.spent) || 0;
    if (oldAmount > 0 && !migratedWorkIds.has(work.id)) {
      totals.set(work.id, (totals.get(work.id) || 0) + oldAmount);
    }
  }

  return totals;
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${dateValue}T12:00:00`),
  );
}

function renderWorkOptions(select, triggerButton, hint) {
  const worksSnapshot = readWorksSnapshot();
  const expensesSnapshot = readExpensesSnapshot();
  const receiptsSnapshot = getReceiptStorageState();
  const works = worksSnapshot.works;
  const storageReadable =
    worksSnapshot.ok && expensesSnapshot.ok && receiptsSnapshot.ok;
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = !storageReadable
    ? "Dados financeiros indisponíveis"
    : works.length
      ? "Selecione uma obra"
      : "Cadastre uma obra primeiro";
  select.append(placeholder);

  for (const work of works) {
    const option = document.createElement("option");
    option.value = work.id;
    option.textContent =
      work.status === "concluida" ? `${work.name} (Concluída)` : work.name;
    select.append(option);
  }

  select.disabled = !storageReadable || works.length === 0;
  triggerButton.disabled = !storageReadable || works.length === 0;
  hint.textContent = !storageReadable
    ? "Não foi possível ler uma ou mais listas financeiras. Os dados existentes foram preservados e novos lançamentos estão bloqueados."
    : worksSnapshot.invalidRecords.length
      ? `${worksSnapshot.invalidRecords.length} registro(s) inválido(s) de obra foram preservados e não estão disponíveis para despesas.`
      : works.length
        ? "Você pode lançar cada gasto ou usar “Gastos gerais” para registrar um valor acumulado."
        : "Cadastre uma obra antes de registrar despesas.";
}

function createExpenseCard(expense, workNames) {
  const card = document.createElement("article");
  card.className = "expense-card";

  const main = document.createElement("div");
  main.className = "expense-card-main";
  main.append(
    createTextElement(
      "span",
      "expense-category",
      categoryNames[expense.category] || "Outros",
    ),
    createTextElement(
      "h4",
      "",
      expense.description || categoryNames[expense.category] || "Despesa",
    ),
  );

  const details = [];
  if (workNames.has(expense.workId))
    details.push(workNames.get(expense.workId));
  if (expense.date) details.push(formatDate(expense.date));
  else if (expense.source === "initial-work-value")
    details.push("Sem data informada");

  const side = document.createElement("div");
  side.className = "expense-card-side";
  side.append(
    createTextElement(
      "strong",
      "expense-amount",
      currencyFormatter.format(Number(expense.amount) || 0),
    ),
    createTextElement("p", "expense-details", details.join(" · ")),
  );

  card.append(main, side);
  return card;
}

function renderExpenses() {
  const worksSnapshot = readWorksSnapshot();
  const expensesSnapshot = readExpensesSnapshot();
  const receiptsSnapshot = getReceiptStorageState();
  if (!worksSnapshot.ok || !expensesSnapshot.ok || !receiptsSnapshot.ok) {
    for (const selector of [
      "#total-received",
      "#total-to-receive",
      "#total-spent",
      "#total-cash-balance",
    ]) {
      document.querySelector(selector).textContent = "—";
    }
    document.querySelector("#expense-count").textContent = "—";
    document.querySelector("#expense-list").replaceChildren();
    document.querySelector("#expense-list").hidden = true;
    document.querySelector("#expenses-empty").hidden = true;
    document.querySelector("#expenses-hint").textContent =
      "Não foi possível ler uma ou mais listas financeiras. Os dados existentes foram preservados; totais e novos lançamentos estão indisponíveis até a leitura ser corrigida.";
    return;
  }
  const works = worksSnapshot.works;
  const expenses = expensesSnapshot.validRecords;
  const workNames = new Map(works.map((work) => [work.id, work.name]));
  const receivedByWork = getReceivedByWork();
  const totalReceived = works.reduce(
    (sum, work) => sum + (receivedByWork.get(work.id) || 0),
    0,
  );
  const totalToReceive = works.reduce((sum, work) => {
    const remaining = Math.max(
      (Number(work.contractValue) || 0) - (receivedByWork.get(work.id) || 0),
      0,
    );
    return sum + remaining;
  }, 0);
  const expensesByWork = getExpensesByWork();
  const totalSpent = [...expensesByWork.values()].reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const totalCashBalance = totalReceived - totalSpent;
  const hasUsableBudgetData =
    works.length > 0 &&
    works.every(
      (work) =>
        Number.isFinite(Number(work.contractValue)) &&
        Number(work.contractValue) > 0,
    );
  const hasOverBudgetWork =
    hasUsableBudgetData &&
    works.some(
      (work) => (expensesByWork.get(work.id) || 0) > Number(work.contractValue),
    );

  const totalSpentCard = document
    .querySelector("#total-spent")
    .closest(".summary-card");
  totalSpentCard.classList.toggle(
    "is-favorable",
    hasUsableBudgetData && !hasOverBudgetWork,
  );
  totalSpentCard.classList.toggle("is-unfavorable", hasOverBudgetWork);

  const cashBalanceCard = document
    .querySelector("#total-cash-balance")
    .closest(".summary-card");
  cashBalanceCard.classList.toggle("is-favorable", totalCashBalance > 0);
  cashBalanceCard.classList.toggle("is-unfavorable", totalCashBalance < 0);

  document.querySelector("#total-received").textContent =
    currencyFormatter.format(totalReceived);
  document.querySelector("#total-to-receive").textContent =
    currencyFormatter.format(totalToReceive);
  document.querySelector("#total-spent").textContent =
    currencyFormatter.format(totalSpent);
  document.querySelector("#total-cash-balance").textContent =
    currencyFormatter.format(totalCashBalance);
  document.querySelector("#expense-count").textContent = expenses.length;

  const expenseList = document.querySelector("#expense-list");
  const emptyState = document.querySelector("#expenses-empty");
  const orderedExpenses = [...expenses].sort((first, second) =>
    String(second.createdAt || "").localeCompare(String(first.createdAt || "")),
  );

  expenseList.replaceChildren(
    ...orderedExpenses.map((expense) => createExpenseCard(expense, workNames)),
  );
  expenseList.hidden = orderedExpenses.length === 0;
  emptyState.hidden = orderedExpenses.length > 0;

  const warnings = [];
  if (worksSnapshot.invalidRecords.length) {
    warnings.push(
      `${worksSnapshot.invalidRecords.length} registro(s) de obra inválido(s) foram preservados e ignorados`,
    );
  }
  if (expensesSnapshot.invalidRecords.length) {
    warnings.push(
      `${expensesSnapshot.invalidRecords.length} lançamento(s) inválido(s) foram preservados e ignorados`,
    );
  }
  if (warnings.length) {
    document.querySelector("#expenses-hint").textContent =
      `${warnings.join("; ")}. Revise os dados salvos antes de excluir registros.`;
  }
}

export function setupExpenses() {
  const dialog = document.querySelector("#expense-dialog");
  const form = document.querySelector("#expense-form");
  const error = document.querySelector("#expense-form-error");
  const amountInput = document.querySelector("#expense-amount");
  const workSelect = document.querySelector("#expense-work");
  const openButton = document.querySelector("#show-expense-form");
  const hint = document.querySelector("#expenses-hint");

  const closeDialog = () => dialog.close();
  const resetForm = () => {
    form.reset();
    amountInput.setCustomValidity("");
    error.textContent = "";
  };

  function refresh() {
    renderWorkOptions(workSelect, openButton, hint);
    renderExpenses();
  }

  openButton.addEventListener("click", () => {
    error.textContent = "";
    dialog.showModal();
    workSelect.focus();
  });
  document
    .querySelector("#close-expense-dialog")
    .addEventListener("click", closeDialog);
  document
    .querySelector("#cancel-expense-form")
    .addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener("close", resetForm);

  form.addEventListener("input", (event) => {
    error.textContent = "";
    event.target.setCustomValidity("");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const worksSnapshot = readWorksSnapshot();
    const expensesSnapshot = readExpensesSnapshot();
    if (!worksSnapshot.ok || !expensesSnapshot.ok) {
      error.textContent =
        "Não é seguro salvar a despesa: os dados existentes não puderam ser lidos e foram preservados.";
      return;
    }

    const formData = new FormData(form);
    const amount = parseBrazilianMoney(amountInput.value);
    amountInput.setCustomValidity("");
    if (!Number.isFinite(amount) || amount <= 0) {
      amountInput.setCustomValidity(
        "Informe um valor maior que zero. Exemplo: 1.250,00.",
      );
      form.reportValidity();
      return;
    }

    const category = String(formData.get("category"));
    const workId = String(formData.get("workId"));
    if (!worksSnapshot.works.some((work) => work.id === workId)) {
      error.textContent =
        "A obra selecionada não está disponível. Atualize a página e tente novamente.";
      return;
    }
    const expense = {
      id: crypto.randomUUID(),
      workId,
      category,
      description: String(formData.get("description") || "").trim(),
      amount,
      date: String(formData.get("date") || ""),
      createdAt: new Date().toISOString(),
    };

    if (
      expensesSnapshot.records.some(
        (savedExpense) => savedExpense?.id === expense.id,
      ) ||
      !writeStoredArray(expensesSnapshot, [
        ...expensesSnapshot.records,
        expense,
      ])
    ) {
      error.textContent =
        "Não foi possível salvar a despesa com segurança. Os dados atuais foram preservados; atualize a página e tente novamente.";
      return;
    }

    closeDialog();
    refresh();
    window.dispatchEvent(new Event("obracontrol:data-changed"));
  });

  window.addEventListener("obracontrol:data-changed", refresh);
  const migrationSucceeded = migrateOldWorkExpenses();
  refresh();

  if (!migrationSucceeded) {
    const worksSnapshot = readWorksSnapshot();
    const expensesSnapshot = readExpensesSnapshot();
    if (worksSnapshot.ok && expensesSnapshot.ok) {
      hint.textContent =
        "Alguns gastos anteriores não puderam ser transferidos. Os dados originais foram preservados; libere espaço no navegador e recarregue a página.";
    }
  }
}
