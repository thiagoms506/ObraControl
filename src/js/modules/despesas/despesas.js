import { parseBrazilianMoney } from "../obras/financeiro.js";

const WORKS_KEY = "obracontrol.obras.v1";
const EXPENSES_KEY = "obracontrol.despesas.v1";

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
  try {
    return JSON.parse(localStorage.getItem(WORKS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function readExpenses() {
  try {
    const expenses = JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]");
    return Array.isArray(expenses) ? expenses : [];
  } catch {
    return [];
  }
}

function saveWorks(works) {
  try {
    localStorage.setItem(WORKS_KEY, JSON.stringify(works));
    return true;
  } catch {
    return false;
  }
}

function saveExpenses(expenses) {
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    return true;
  } catch {
    return false;
  }
}

export function deleteWorkAndExpenses(workId) {
  const works = readWorks();
  const expenses = readExpenses();
  const originalWorks = localStorage.getItem(WORKS_KEY);
  const originalExpenses = localStorage.getItem(EXPENSES_KEY);
  const updatedWorks = works.filter((work) => work.id !== workId);
  const updatedExpenses = expenses.filter((expense) => expense.workId !== workId);

  if (updatedWorks.length === works.length) return false;

  try {
    localStorage.setItem(WORKS_KEY, JSON.stringify(updatedWorks));
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updatedExpenses));
    return true;
  } catch {
    try {
      if (originalWorks === null) localStorage.removeItem(WORKS_KEY);
      else localStorage.setItem(WORKS_KEY, originalWorks);
      if (originalExpenses === null) localStorage.removeItem(EXPENSES_KEY);
      else localStorage.setItem(EXPENSES_KEY, originalExpenses);
    } catch {
      // Keep the failure visible to the caller; localStorage writes are synchronous.
    }
    return false;
  }
}

function migrateOldWorkExpenses() {
  const works = readWorks();
  const expenses = readExpenses();
  const migratedWorkIds = new Set(
    expenses.filter((expense) => expense.source === "initial-work-value").map((expense) => expense.workId),
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

  if (expensesChanged && !saveExpenses(expenses)) return false;

  const worksToUpdate = works.filter((work) => Number(work.spent) > 0 && migratedWorkIds.has(work.id));
  if (worksToUpdate.length === 0) return true;

  const updatedWorks = works.map((work) =>
    migratedWorkIds.has(work.id) ? { ...work, spent: 0 } : work,
  );
  return saveWorks(updatedWorks);
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
    expenses.filter((expense) => expense.source === "initial-work-value").map((expense) => expense.workId),
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
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${dateValue}T12:00:00`));
}

function renderWorkOptions(select, triggerButton, hint) {
  const works = readWorks();
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = works.length ? "Selecione uma obra" : "Cadastre uma obra primeiro";
  select.append(placeholder);

  for (const work of works) {
    const option = document.createElement("option");
    option.value = work.id;
    option.textContent = work.status === "concluida" ? `${work.name} (Concluída)` : work.name;
    select.append(option);
  }

  select.disabled = works.length === 0;
  triggerButton.disabled = works.length === 0;
  hint.textContent = works.length
    ? "Você pode lançar cada gasto ou usar “Gastos gerais” para registrar um valor acumulado."
    : "Cadastre uma obra antes de registrar despesas.";
}

function createExpenseCard(expense, workNames) {
  const card = document.createElement("article");
  card.className = "expense-card";

  const main = document.createElement("div");
  main.className = "expense-card-main";
  main.append(
    createTextElement("span", "expense-category", categoryNames[expense.category] || "Outros"),
    createTextElement("h4", "", expense.description || categoryNames[expense.category] || "Despesa"),
  );

  const details = [];
  if (workNames.has(expense.workId)) details.push(workNames.get(expense.workId));
  if (expense.date) details.push(formatDate(expense.date));
  else if (expense.source === "initial-work-value") details.push("Sem data informada");

  const side = document.createElement("div");
  side.className = "expense-card-side";
  side.append(
    createTextElement("strong", "expense-amount", currencyFormatter.format(Number(expense.amount) || 0)),
    createTextElement("p", "expense-details", details.join(" · ")),
  );

  card.append(main, side);
  return card;
}

function renderExpenses() {
  const works = readWorks();
  const expenses = readExpenses();
  const workNames = new Map(works.map((work) => [work.id, work.name]));
  const totalReceived = works.reduce((sum, work) => sum + (Number(work.received) || 0), 0);
  const totalToReceive = works.reduce((sum, work) => {
    const remaining = Math.max((Number(work.contractValue) || 0) - (Number(work.received) || 0), 0);
    return sum + remaining;
  }, 0);
  const totalSpent = [...getExpensesByWork().values()].reduce((sum, amount) => sum + amount, 0);

  document.querySelector("#total-received").textContent = currencyFormatter.format(totalReceived);
  document.querySelector("#total-to-receive").textContent = currencyFormatter.format(totalToReceive);
  document.querySelector("#total-spent").textContent = currencyFormatter.format(totalSpent);
  document.querySelector("#total-cash-balance").textContent = currencyFormatter.format(totalReceived - totalSpent);
  document.querySelector("#expense-count").textContent = `${expenses.length} ${expenses.length === 1 ? "despesa" : "despesas"}`;

  const expenseList = document.querySelector("#expense-list");
  const emptyState = document.querySelector("#expenses-empty");
  const orderedExpenses = [...expenses].sort((first, second) =>
    String(second.createdAt || "").localeCompare(String(first.createdAt || "")),
  );

  expenseList.replaceChildren(...orderedExpenses.map((expense) => createExpenseCard(expense, workNames)));
  expenseList.hidden = orderedExpenses.length === 0;
  emptyState.hidden = orderedExpenses.length > 0;
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
  document.querySelector("#close-expense-dialog").addEventListener("click", closeDialog);
  document.querySelector("#cancel-expense-form").addEventListener("click", closeDialog);
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

    const formData = new FormData(form);
    const amount = parseBrazilianMoney(amountInput.value);
    amountInput.setCustomValidity("");
    if (!Number.isFinite(amount) || amount <= 0) {
      amountInput.setCustomValidity("Informe um valor maior que zero. Exemplo: 1.250,00.");
      form.reportValidity();
      return;
    }

    const category = String(formData.get("category"));
    const expense = {
      id: crypto.randomUUID(),
      workId: String(formData.get("workId")),
      category,
      description: String(formData.get("description") || "").trim(),
      amount,
      date: String(formData.get("date") || ""),
      createdAt: new Date().toISOString(),
    };

    const expenses = [...readExpenses(), expense];
    if (!saveExpenses(expenses)) {
      error.textContent = "Não foi possível salvar a despesa neste navegador.";
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
    hint.textContent = "Alguns gastos anteriores não puderam ser transferidos. Libere espaço no navegador e recarregue a página.";
  }
}
