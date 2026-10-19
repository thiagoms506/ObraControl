import { parseBrazilianMoney, summarizeWork } from "./financeiro.js";
import {
  deleteWorkAndExpenses,
  getExpensesByWork,
} from "../despesas/despesas.js";

const STORAGE_KEY = "obracontrol.obras.v1";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const moneyInputFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const statusNames = {
  planejada: "Planejada",
  "em-andamento": "Em andamento",
  pausada: "Pausada",
  concluida: "Concluída",
};

function readWorks() {
  try {
    const savedWorks = localStorage.getItem(STORAGE_KEY);
    if (!savedWorks) return [];

    const works = JSON.parse(savedWorks);
    return Array.isArray(works) ? works : [];
  } catch {
    return [];
  }
}

function saveWorks(works) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
    return true;
  } catch {
    return false;
  }
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createMetric(label, value, extraClass = "") {
  const item = document.createElement("div");
  item.className = "work-financial-item";

  const name = createTextElement("dt", "", label);
  const amount = createTextElement(
    "dd",
    extraClass,
    moneyFormatter.format(value),
  );

  item.append(name, amount);
  return item;
}

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function createWorkCard(work, spent) {
  const card = document.createElement("article");
  card.className = "work-card";

  const top = document.createElement("div");
  top.className = "work-card-top";

  const titleBlock = document.createElement("div");
  titleBlock.append(createTextElement("h3", "", work.name));

  if (work.client) {
    titleBlock.append(
      createTextElement("p", "work-card-subtitle", `Cliente: ${work.client}`),
    );
  }

  if (work.location) {
    titleBlock.append(
      createTextElement("p", "work-card-location", work.location),
    );
  }

  const status = createTextElement(
    "span",
    `status-badge status-${work.status}`,
    statusNames[work.status] || "Planejada",
  );
  top.append(titleBlock, status);
  card.append(top);

  const received = Number(work.received) || 0;
  const contractValue = Number(work.contractValue) || 0;
  const summary = summarizeWork(contractValue, received, spent);

  const body = document.createElement("div");
  body.className = "work-card-body";

  const metrics = document.createElement("dl");
  metrics.className = "work-financial-grid";
  metrics.append(
    createMetric("Valor contratado", contractValue),
    createMetric("Já recebido", received),
    createMetric("Falta receber", summary.remainingToReceive),
    createMetric("Total em despesas", spent),
    createMetric(
      "Recebido após gastos",
      summary.cashBalance,
      summary.cashBalance < 0 ? "is-negative" : "",
    ),
  );

  const chartPanel = document.createElement("div");
  chartPanel.className = "work-chart-panel";

  const chart = document.createElement("div");
  chart.className = "pie-chart";
  chart.setAttribute("role", "img");
  chart.setAttribute(
    "aria-label",
    `Do valor contratado de ${moneyFormatter.format(contractValue)}, ${moneyFormatter.format(summary.chartedSpent)} já foi gasto e ${moneyFormatter.format(summary.notYetSpent)} ainda não foi gasto.`,
  );
  chart.style.setProperty("--spent-share", `${summary.spentShare}%`);

  const legend = document.createElement("div");
  legend.className = "chart-legend";
  legend.append(
    createLegendItem("Gastos", spent, ""),
    createLegendItem(
      "Contratado ainda não gasto",
      summary.notYetSpent,
      "remaining",
    ),
  );
  chartPanel.append(chart, legend);
  body.append(metrics, chartPanel);
  card.append(body);

  if (summary.overBudget > 0) {
    card.append(
      createTextElement(
        "p",
        "work-over-budget",
        `Os gastos superaram o valor contratado em ${moneyFormatter.format(summary.overBudget)}.`,
      ),
    );
  }

  if (summary.overReceived > 0) {
    card.append(
      createTextElement(
        "p",
        "work-over-budget",
        `O valor recebido supera o contrato em ${moneyFormatter.format(summary.overReceived)}.`,
      ),
    );
  }

  const dates = [];
  if (work.startDate) dates.push(`Início: ${formatDate(work.startDate)}`);
  if (work.endDate)
    dates.push(`Previsão de conclusão: ${formatDate(work.endDate)}`);
  if (dates.length)
    card.append(createTextElement("p", "work-dates", dates.join(" · ")));

  if (work.notes) card.append(createTextElement("p", "work-notes", work.notes));

  const actions = document.createElement("div");
  actions.className = "work-card-actions";
  const editButton = createTextElement(
    "button",
    "button button-secondary",
    "Editar obra",
  );
  editButton.type = "button";
  editButton.dataset.editWorkId = work.id;
  const deleteButton = createTextElement(
    "button",
    "button button-danger",
    "Excluir obra",
  );
  deleteButton.type = "button";
  deleteButton.dataset.deleteWorkId = work.id;
  actions.append(editButton, deleteButton);
  card.append(actions);

  return card;
}

function createLegendItem(label, value, colorClass) {
  const item = document.createElement("div");
  item.className = "chart-legend-item";

  const dot = createTextElement("span", `legend-dot ${colorClass}`, "");
  dot.setAttribute("aria-hidden", "true");
  const description = document.createElement("span");
  description.append(
    document.createTextNode(label),
    createTextElement("strong", "", moneyFormatter.format(value)),
  );

  item.append(dot, description);
  return item;
}

function renderWorks(workList, emptyState, currentView) {
  const works = readWorks();
  const completedWorks = works.filter((work) => work.status === "concluida");
  const activeWorks = works.filter((work) => work.status !== "concluida");
  const visibleWorks = currentView === "history" ? completedWorks : activeWorks;

  document.querySelector("#active-work-count").textContent = activeWorks.length;
  document.querySelector("#history-work-count").textContent =
    completedWorks.length;
  document.querySelector("#works-empty-title").textContent =
    currentView === "history"
      ? "Nenhuma obra concluída"
      : works.length === 0
        ? "Nenhuma obra cadastrada"
        : "Nenhuma obra ativa";
  document.querySelector("#works-empty-message").textContent =
    currentView === "history"
      ? "Obras marcadas como concluídas aparecerão aqui."
      : works.length === 0
        ? "Cadastre sua primeira obra para começar a acompanhar os valores."
        : "As obras concluídas estão no Histórico. Você também pode cadastrar uma nova obra.";
  document.querySelector("#empty-new-work").hidden = currentView === "history";

  const expensesByWork = getExpensesByWork();
  workList.replaceChildren(
    ...visibleWorks.map((work) =>
      createWorkCard(work, expensesByWork.get(work.id) || 0),
    ),
  );
  workList.hidden = visibleWorks.length === 0;
  emptyState.hidden = visibleWorks.length > 0;
}

export function setupWorks() {
  const dialog = document.querySelector("#work-dialog");
  const form = document.querySelector("#work-form");
  const workList = document.querySelector("#work-list");
  const emptyState = document.querySelector("#works-empty");
  const feedback = document.querySelector("#works-feedback");
  const formError = document.querySelector("#work-form-error");
  const titleEyebrow = document.querySelector("#work-dialog-eyebrow");
  const dialogTitle = document.querySelector("#work-dialog-title");
  const activeTab = document.querySelector("#active-works-tab");
  const historyTab = document.querySelector("#history-tab");
  let editingWorkId = null;
  let currentView = "active";

  function renderCurrentWorks() {
    renderWorks(workList, emptyState, currentView);
  }

  function selectView(view) {
    currentView = view;
    const showingHistory = currentView === "history";

    activeTab.classList.toggle("is-selected", !showingHistory);
    activeTab.setAttribute("aria-pressed", String(!showingHistory));
    historyTab.classList.toggle("is-selected", showingHistory);
    historyTab.setAttribute("aria-pressed", String(showingHistory));
    renderCurrentWorks();
  }

  function resetDialog() {
    editingWorkId = null;
    form.reset();
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      field.setCustomValidity("");
    });
    formError.textContent = "";
    titleEyebrow.textContent = "NOVA OBRA";
    dialogTitle.textContent = "Cadastrar obra";
  }

  const openDialog = () => {
    resetDialog();
    feedback.textContent = "";
    dialog.showModal();
    form.querySelector('[name="name"]').focus();
  };

  const closeDialog = () => {
    dialog.close();
  };

  function openEditDialog(work) {
    resetDialog();
    editingWorkId = work.id;
    titleEyebrow.textContent = "EDITAR OBRA";
    dialogTitle.textContent = "Editar obra";
    feedback.textContent = "";

    form.querySelector('[name="name"]').value = work.name || "";
    form.querySelector('[name="client"]').value = work.client || "";
    form.querySelector('[name="location"]').value = work.location || "";
    form.querySelector('[name="status"]').value = work.status || "planejada";
    form.querySelector('[name="contractValue"]').value =
      moneyInputFormatter.format(Number(work.contractValue) || 0);
    form.querySelector('[name="received"]').value = moneyInputFormatter.format(
      Number(work.received) || 0,
    );
    form.querySelector('[name="startDate"]').value = work.startDate || "";
    form.querySelector('[name="endDate"]').value = work.endDate || "";
    form.querySelector('[name="notes"]').value = work.notes || "";

    dialog.showModal();
    form.querySelector('[name="name"]').focus();
  }

  document
    .querySelector("#show-work-form")
    .addEventListener("click", openDialog);
  document
    .querySelector("#empty-new-work")
    .addEventListener("click", openDialog);
  document
    .querySelector("#close-work-dialog")
    .addEventListener("click", closeDialog);
  document
    .querySelector("#cancel-work-form")
    .addEventListener("click", closeDialog);
  activeTab.addEventListener("click", () => selectView("active"));
  historyTab.addEventListener("click", () => selectView("history"));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  dialog.addEventListener("close", resetDialog);

  workList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-work-id]");
    if (deleteButton) {
      const work = readWorks().find(
        (item) => item.id === deleteButton.dataset.deleteWorkId,
      );
      if (!work) return;

      const expenseTotal = getExpensesByWork().get(work.id) || 0;
      const expenseSummary =
        expenseTotal > 0
          ? `Também serão removidos os registros de despesas vinculados, no total de ${moneyFormatter.format(expenseTotal)}.`
          : "";
      const confirmed = window.confirm(
        `Deseja excluir a obra “${work.name}”?\n\n${expenseSummary}\n\nEssa ação não pode ser desfeita.`,
      );
      if (!confirmed) return;

      if (!deleteWorkAndExpenses(work.id)) {
        feedback.textContent =
          "Não foi possível excluir a obra neste navegador. Os dados foram mantidos.";
        return;
      }

      feedback.textContent = `Obra “${work.name}” excluída.`;
      window.dispatchEvent(new Event("obracontrol:data-changed"));
      return;
    }

    const editButton = event.target.closest("[data-edit-work-id]");
    if (!editButton) return;

    const work = readWorks().find(
      (item) => item.id === editButton.dataset.editWorkId,
    );
    if (work) openEditDialog(work);
  });

  form.addEventListener("input", (event) => {
    formError.textContent = "";
    event.target.setCustomValidity("");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    formError.textContent = "";

    const formData = new FormData(form);
    const nameInput = form.querySelector('[name="name"]');
    const contractInput = form.querySelector('[name="contractValue"]');
    const receivedInput = form.querySelector('[name="received"]');
    const contractValue = parseBrazilianMoney(contractInput.value);
    const received = parseBrazilianMoney(receivedInput.value);

    nameInput.setCustomValidity("");
    contractInput.setCustomValidity("");
    receivedInput.setCustomValidity("");

    if (!nameInput.value.trim()) {
      nameInput.setCustomValidity("Informe o nome da obra.");
    }
    if (!Number.isFinite(contractValue) || contractValue <= 0) {
      contractInput.setCustomValidity(
        "Informe um valor contratado válido. Exemplo: 50.000,00.",
      );
    }
    if (!Number.isFinite(received) || received < 0) {
      receivedInput.setCustomValidity(
        "Informe um valor recebido válido, sem valor negativo.",
      );
    }

    if (!form.reportValidity()) return;

    const startDate = String(formData.get("startDate") || "");
    const endDate = String(formData.get("endDate") || "");

    if (startDate && endDate && endDate < startDate) {
      formError.textContent =
        "A previsão de conclusão deve ser na mesma data ou posterior ao início.";
      return;
    }

    const isEditing = Boolean(editingWorkId);
    const works = readWorks();
    const existingWork = works.find((item) => item.id === editingWorkId);
    const work = {
      id: editingWorkId || crypto.randomUUID(),
      name: String(formData.get("name")).trim(),
      client: String(formData.get("client") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      status: String(formData.get("status")),
      contractValue,
      received,
      startDate,
      endDate,
      notes: String(formData.get("notes") || "").trim(),
      createdAt: existingWork?.createdAt || new Date().toISOString(),
    };

    const updatedWorks = editingWorkId
      ? works.map((item) => (item.id === editingWorkId ? work : item))
      : [...works, work];

    if (!saveWorks(updatedWorks)) {
      formError.textContent = "Não foi possível salvar a obra neste navegador.";
      return;
    }

    selectView(work.status === "concluida" ? "history" : "active");
    closeDialog();
    window.dispatchEvent(new Event("obracontrol:data-changed"));
    feedback.textContent = isEditing
      ? `Obra “${work.name}” atualizada.`
      : `Obra “${work.name}” cadastrada.`;
  });

  window.addEventListener("obracontrol:data-changed", renderCurrentWorks);
  renderCurrentWorks();
}
