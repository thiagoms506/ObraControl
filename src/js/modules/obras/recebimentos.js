import { parseBrazilianMoney } from "./financeiro.js";

const WORKS_KEY = "obracontrol.obras.v1";
const RECEIPTS_KEY = "obracontrol.recebimentos.v1";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function readWorks() {
  try {
    const works = JSON.parse(localStorage.getItem(WORKS_KEY) || "[]");
    return Array.isArray(works) ? works : [];
  } catch {
    return [];
  }
}

export function readReceipts() {
  try {
    const receipts = JSON.parse(localStorage.getItem(RECEIPTS_KEY) || "[]");
    return Array.isArray(receipts) ? receipts : [];
  } catch {
    return [];
  }
}

function saveReceipts(receipts) {
  try {
    const savedReceipts = localStorage.getItem(RECEIPTS_KEY);
    if (savedReceipts !== null && !Array.isArray(JSON.parse(savedReceipts))) {
      return false;
    }
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
    return true;
  } catch {
    return false;
  }
}

export function saveReceipt(receipt) {
  const amount = Number(receipt?.amount);
  const works = readWorks();
  const receipts = readReceipts();

  if (
    !receipt?.id ||
    !receipt.workId ||
    !works.some((work) => work.id === receipt.workId) ||
    receipts.some((savedReceipt) => savedReceipt.id === receipt.id) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !receipt.date
  ) {
    return false;
  }

  return saveReceipts([...receipts, receipt]);
}

function createLegacyReceipt(work) {
  return {
    id: `legacy-opening-${work.id}`,
    workId: work.id,
    amount: Number(work.received) || 0,
    date: "",
    description: "Valor recebido antes do histórico de pagamentos",
    source: "legacy-opening-balance",
    createdAt: work.createdAt || new Date().toISOString(),
  };
}

export function migrateLegacyReceipts() {
  const works = readWorks();
  const receipts = readReceipts();
  const migratedWorkIds = new Set(
    receipts
      .filter((receipt) => receipt.source === "legacy-opening-balance")
      .map((receipt) => receipt.workId),
  );
  let changed = false;

  for (const work of works) {
    const oldReceived = Number(work.received) || 0;
    if (oldReceived <= 0 || migratedWorkIds.has(work.id)) continue;

    receipts.push(createLegacyReceipt(work));
    migratedWorkIds.add(work.id);
    changed = true;
  }

  return !changed || saveReceipts(receipts);
}

export function getReceiptsByWork() {
  const receiptsByWork = new Map();
  const receipts = readReceipts();

  for (const receipt of receipts) {
    const amount = Number(receipt.amount);
    if (!receipt.workId || !Number.isFinite(amount) || amount <= 0) continue;

    const workReceipts = receiptsByWork.get(receipt.workId) || [];
    workReceipts.push(receipt);
    receiptsByWork.set(receipt.workId, workReceipts);
  }

  const migratedWorkIds = new Set(
    receipts
      .filter((receipt) => receipt.source === "legacy-opening-balance")
      .map((receipt) => receipt.workId),
  );

  for (const work of readWorks()) {
    const oldReceived = Number(work.received) || 0;
    if (oldReceived <= 0 || migratedWorkIds.has(work.id)) continue;

    const workReceipts = receiptsByWork.get(work.id) || [];
    workReceipts.push(createLegacyReceipt(work));
    receiptsByWork.set(work.id, workReceipts);
  }

  return receiptsByWork;
}

export function getReceivedByWork() {
  return new Map(
    [...getReceiptsByWork()].map(([workId, receipts]) => [
      workId,
      receipts.reduce((total, receipt) => total + Number(receipt.amount), 0),
    ]),
  );
}

function getLocalDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${dateValue}T12:00:00`),
  );
}

function renderReceiptHistory(receipts) {
  const history = document.createElement("details");
  history.className = "receipt-history";

  const summary = document.createElement("summary");
  summary.textContent = `Histórico de recebimentos (${receipts.length})`;
  history.append(summary);

  if (receipts.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "receipt-history-empty";
    emptyMessage.textContent = "Nenhum recebimento registrado ainda.";
    history.append(emptyMessage);
    return history;
  }

  const list = document.createElement("ul");
  list.className = "receipt-list";
  const orderedReceipts = [...receipts].sort((first, second) => {
    const dateOrder = String(second.date || "").localeCompare(
      String(first.date || ""),
    );
    return (
      dateOrder ||
      String(second.createdAt || "").localeCompare(
        String(first.createdAt || ""),
      )
    );
  });

  for (const receipt of orderedReceipts) {
    const item = document.createElement("li");
    item.className = "receipt-item";

    const heading = document.createElement("div");
    heading.className = "receipt-item-heading";
    const amount = document.createElement("strong");
    amount.textContent = moneyFormatter.format(Number(receipt.amount) || 0);
    const date = document.createElement("time");
    date.textContent = formatDate(receipt.date);
    if (receipt.date) date.dateTime = receipt.date;
    heading.append(amount, date);

    item.append(heading);
    if (receipt.description) {
      const description = document.createElement("p");
      description.textContent = receipt.description;
      item.append(description);
    }
    list.append(item);
  }

  history.append(list);
  return history;
}

export function addReceiptToWorkList(card, receipts) {
  card.append(renderReceiptHistory(receipts));
}

export function setupReceipts() {
  const dialog = document.querySelector("#receipt-dialog");
  const form = document.querySelector("#receipt-form");
  const amountInput = document.querySelector("#receipt-amount");
  const dateInput = document.querySelector("#receipt-date");
  const workIdInput = document.querySelector("#receipt-work-id");
  const error = document.querySelector("#receipt-form-error");
  let selectedWork = null;

  function resetForm() {
    selectedWork = null;
    form.reset();
    dateInput.value = getLocalDateValue();
    amountInput.setCustomValidity("");
    error.textContent = "";
  }

  document.querySelector("#work-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-register-receipt-id]");
    if (!button) return;

    resetForm();
    selectedWork = readWorks().find(
      (work) => work.id === button.dataset.registerReceiptId,
    );
    if (!selectedWork) return;

    workIdInput.value = selectedWork.id;
    document.querySelector("#receipt-work-name").textContent =
      selectedWork.name;
    dialog.showModal();
    amountInput.focus();
  });

  document
    .querySelector("#close-receipt-dialog")
    .addEventListener("click", () => dialog.close());
  document
    .querySelector("#cancel-receipt-form")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", resetForm);
  form.addEventListener("input", (event) => {
    error.textContent = "";
    event.target.setCustomValidity("");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const workId = String(workIdInput.value);
    const work = readWorks().find((item) => item.id === workId);
    if (!work || !selectedWork || selectedWork.id !== workId) {
      error.textContent =
        "A obra selecionada não existe mais. Feche o formulário e tente novamente.";
      return;
    }

    const amount = parseBrazilianMoney(amountInput.value);
    amountInput.setCustomValidity("");
    if (!Number.isFinite(amount) || amount <= 0) {
      amountInput.setCustomValidity(
        "Informe um valor maior que zero. Exemplo: 1.500,00.",
      );
      form.reportValidity();
      return;
    }

    const date = String(dateInput.value || "");
    if (!date) {
      dateInput.setCustomValidity("Informe a data do recebimento.");
      form.reportValidity();
      return;
    }

    const received = getReceivedByWork().get(work.id) || 0;
    const contractValue = Number(work.contractValue) || 0;
    const remaining = Math.max(contractValue - received, 0);
    const exceedsBy = contractValue > 0 ? amount - remaining : 0;
    if (
      contractValue > 0 &&
      exceedsBy > 0 &&
      !window.confirm(
        `Este recebimento ultrapassa o saldo do contrato em ${moneyFormatter.format(exceedsBy)}. Deseja registrar mesmo assim?`,
      )
    ) {
      return;
    }

    const receipt = {
      id: crypto.randomUUID(),
      workId: work.id,
      amount,
      date,
      description: String(new FormData(form).get("description") || "").trim(),
      createdAt: new Date().toISOString(),
    };
    if (!saveReceipt(receipt)) {
      error.textContent =
        "Não foi possível salvar o recebimento neste navegador. O lançamento não foi confirmado.";
      return;
    }

    dialog.close();
    window.dispatchEvent(new Event("obracontrol:data-changed"));
    const excessNotice =
      exceedsBy > 0
        ? ` O valor registrado excede o contrato em ${moneyFormatter.format(exceedsBy)}.`
        : "";
    document.querySelector("#works-feedback").textContent =
      `Recebimento de ${moneyFormatter.format(amount)} registrado para ${work.name}.${excessNotice}`;
  });

  migrateLegacyReceipts();
  dateInput.value = getLocalDateValue();
}
