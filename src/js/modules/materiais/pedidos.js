import { readWorksSnapshot } from "../obras/armazenamento.js";

const MATERIAL_CATALOG = [
  {
    category: "Alvenaria",
    items: [
      { name: "Tijolo", unit: "unidade" },
      { name: "Bloco de concreto", unit: "unidade" },
      { name: "Cimento", unit: "saco" },
      { name: "Areia", unit: "m³" },
      { name: "Argamassa", unit: "saco" },
    ],
  },
  {
    category: "Estrutura",
    items: [
      { name: "Vergalhão", unit: "barra" },
      { name: "Arame recozido", unit: "kg" },
      { name: "Brita", unit: "m³" },
      { name: "Concreto", unit: "m³" },
    ],
  },
  {
    category: "Acabamento",
    items: [
      { name: "Massa corrida", unit: "saco" },
      { name: "Gesso", unit: "saco" },
      { name: "Tinta", unit: "litro" },
      { name: "Rejunte", unit: "saco" },
      { name: "Revestimento cerâmico", unit: "m²" },
    ],
  },
  {
    category: "Instalação hidráulica",
    items: [
      { name: "Tubo PVC", unit: "metro" },
      { name: "Conexão PVC", unit: "unidade" },
      { name: "Registro", unit: "unidade" },
    ],
  },
  {
    category: "Instalação elétrica",
    items: [
      { name: "Fio elétrico", unit: "metro" },
      { name: "Cabo elétrico", unit: "metro" },
      { name: "Conduíte", unit: "metro" },
      { name: "Disjuntor", unit: "unidade" },
    ],
  },
];

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 6,
});

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function normalizeName(value) {
  return String(value)
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value) {
  return (
    normalizeName(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "obra"
  );
}

function createPrintElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function buildPrintDocument(container, work, items, notes) {
  container.replaceChildren();

  const header = createPrintElement("header", "materials-print-header");
  const brand = createPrintElement("div", "materials-print-brand");
  brand.append(
    createPrintElement("span", "materials-print-mark", "OC"),
    createPrintElement("strong", "", "ObraControl"),
  );
  header.append(
    brand,
    createPrintElement(
      "p",
      "materials-print-subtitle",
      "LISTA PARA ORIENTAR A COMPRA",
    ),
  );
  container.append(header);

  container.append(
    createPrintElement("h1", "materials-print-title", "Pedido de Materiais"),
  );

  const metadata = document.createElement("dl");
  metadata.className = "materials-print-metadata";
  const details = [
    ["Obra", work.name],
    ["Data de emissão", new Intl.DateTimeFormat("pt-BR").format(new Date())],
  ];
  for (const [label, value] of details) {
    const group = document.createElement("div");
    group.append(
      createPrintElement("dt", "", label),
      createPrintElement("dd", "", value),
    );
    metadata.append(group);
  }
  container.append(metadata);

  const table = document.createElement("table");
  table.className = "materials-print-table";
  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of [
    "Nº",
    "Material",
    "Quantidade",
    "Unidade",
    "Conferido",
  ]) {
    const heading = createPrintElement("th", "", label);
    heading.scope = "col";
    headerRow.append(heading);
  }
  head.append(headerRow);
  table.append(head);

  const body = document.createElement("tbody");
  items.forEach((item, index) => {
    const row = document.createElement("tr");
    const cells = [
      String(index + 1),
      item.name.trim(),
      quantityFormatter.format(Number(item.quantity)),
      item.unit.trim(),
      "□",
    ];
    cells.forEach((value, cellIndex) => {
      const cell = createPrintElement("td", "", value);
      if (cellIndex === 4) cell.className = "materials-print-checkbox";
      row.append(cell);
    });
    body.append(row);
  });
  table.append(body);
  container.append(table);

  if (notes.trim()) {
    const notesBlock = createPrintElement("section", "materials-print-notes");
    notesBlock.append(
      createPrintElement("h2", "", "Observações"),
      createPrintElement("p", "", notes.trim()),
    );
    container.append(notesBlock);
  }

  container.append(
    createPrintElement(
      "p",
      "materials-print-footer",
      "Confira as quantidades e medidas no local antes de realizar a compra.",
    ),
  );
}

function draftIsValid(workId, draftItems) {
  return (
    Boolean(workId) &&
    draftItems.length > 0 &&
    draftItems.every(
      (item) =>
        item.name.trim() &&
        Number.isFinite(Number(item.quantity)) &&
        Number(item.quantity) > 0 &&
        item.unit.trim(),
    )
  );
}

function updateGenerateButton(workSelect, draftItems, generateButton) {
  generateButton.disabled = !draftIsValid(workSelect.value, draftItems);
}

function createDraftItemRow(item, index, refreshButton, removeItem) {
  const row = document.createElement("article");
  row.className = "materials-item-row";
  row.append(
    createPrintElement("span", "materials-item-number", String(index + 1)),
  );
  row.append(createPrintElement("strong", "materials-item-name", item.name));

  const quantityLabel = document.createElement("label");
  quantityLabel.className = "field materials-item-field";
  quantityLabel.append(createPrintElement("span", "", "Quantidade"));
  const quantityInput = document.createElement("input");
  quantityInput.type = "number";
  quantityInput.min = "0";
  quantityInput.step = "any";
  quantityInput.value = item.quantity;
  quantityInput.setAttribute("aria-label", `Quantidade de ${item.name}`);
  quantityInput.addEventListener("input", () => {
    item.quantity = quantityInput.value;
    quantityInput.setCustomValidity(
      quantityInput.value && Number(quantityInput.value) > 0
        ? ""
        : "Informe uma quantidade maior que zero.",
    );
    refreshButton();
  });
  quantityLabel.append(quantityInput);
  row.append(quantityLabel);

  const unitLabel = document.createElement("label");
  unitLabel.className = "field materials-item-field";
  unitLabel.append(createPrintElement("span", "", "Unidade"));
  const unitInput = document.createElement("input");
  unitInput.type = "text";
  unitInput.maxLength = 20;
  unitInput.setAttribute("list", "materials-unit-options");
  unitInput.value = item.unit;
  unitInput.setAttribute("aria-label", `Unidade de ${item.name}`);
  unitInput.addEventListener("input", () => {
    item.unit = unitInput.value;
    refreshButton();
  });
  unitLabel.append(unitInput);
  row.append(unitLabel);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "materials-remove-button";
  removeButton.textContent = "Remover";
  removeButton.setAttribute("aria-label", `Remover ${item.name}`);
  removeButton.addEventListener("click", removeItem);
  row.append(removeButton);
  return row;
}

function renderDraftView({
  draftItems,
  workSelect,
  itemsList,
  emptyItems,
  itemCount,
  generateButton,
  removeItem,
}) {
  itemsList.replaceChildren();
  emptyItems.hidden = draftItems.length > 0;
  itemCount.textContent = `${draftItems.length} ${draftItems.length === 1 ? "item" : "itens"}`;
  const refreshButton = () =>
    updateGenerateButton(workSelect, draftItems, generateButton);

  draftItems.forEach((item, index) => {
    itemsList.append(
      createDraftItemRow(item, index, refreshButton, () => removeItem(item.id)),
    );
  });
  refreshButton();
}

function setupCatalogForms(
  categorySelect,
  catalogItemSelect,
  catalogForm,
  addItem,
) {
  MATERIAL_CATALOG.forEach(({ category }) => {
    categorySelect.append(createOption(category, category));
  });

  categorySelect.addEventListener("change", () => {
    const category = MATERIAL_CATALOG.find(
      (entry) => entry.category === categorySelect.value,
    );
    catalogItemSelect.replaceChildren(
      createOption(
        "",
        category ? "Selecione um material" : "Selecione uma categoria primeiro",
      ),
    );
    catalogItemSelect.disabled = !category;
    category?.items.forEach((item) => {
      catalogItemSelect.append(createOption(item.name, item.name));
    });
  });

  catalogItemSelect.addEventListener("change", () => {
    const category = MATERIAL_CATALOG.find(
      (entry) => entry.category === categorySelect.value,
    );
    const material = category?.items.find(
      (item) => item.name === catalogItemSelect.value,
    );
    catalogForm.elements.unit.value = material?.unit || "";
  });

  catalogForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!catalogForm.reportValidity()) return;
    const data = new FormData(catalogForm);
    if (
      addItem(catalogItemSelect.value, data.get("quantity"), data.get("unit"))
    ) {
      catalogForm.reset();
      catalogItemSelect.replaceChildren(
        createOption("", "Selecione uma categoria primeiro"),
      );
      catalogItemSelect.disabled = true;
    }
  });
}

function setupManualForm(manualForm, addItem) {
  manualForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!manualForm.reportValidity()) return;
    const data = new FormData(manualForm);
    if (addItem(data.get("name"), data.get("quantity"), data.get("unit"))) {
      manualForm.reset();
    }
  });
}

export function setupMaterialsOrders() {
  const workSelect = document.querySelector("#materials-work");
  if (!workSelect) return;

  const builder = document.querySelector("#materials-builder");
  const noWorks = document.querySelector("#materials-no-works");
  const noWorksTitle = noWorks.querySelector("h3");
  const noWorksMessage = noWorks.querySelector("p");
  const noWorksLink = noWorks.querySelector("a");
  const categorySelect = document.querySelector("#materials-category");
  const catalogItemSelect = document.querySelector("#materials-catalog-item");
  const catalogForm = document.querySelector("#materials-catalog-form");
  const manualForm = document.querySelector("#materials-manual-form");
  const itemsList = document.querySelector("#materials-items");
  const emptyItems = document.querySelector("#materials-empty");
  const itemCount = document.querySelector("#materials-item-count");
  const notesInput = document.querySelector("#materials-notes");
  const generateButton = document.querySelector("#materials-generate-pdf");
  const feedback = document.querySelector("#materials-feedback");
  const printDocument = document.querySelector("#materials-print-document");
  const originalTitle = document.title;
  let draftItems = [];
  let selectedWorkId = "";

  function announce(message) {
    feedback.textContent = message;
  }

  function resetAddForms() {
    catalogForm.reset();
    manualForm.reset();
    catalogItemSelect.replaceChildren(
      createOption("", "Selecione uma categoria primeiro"),
    );
    catalogItemSelect.disabled = true;
  }

  function clearDraft() {
    draftItems = [];
    notesInput.value = "";
    resetAddForms();
    renderDraft();
  }

  function renderDraft() {
    renderDraftView({
      draftItems,
      workSelect,
      itemsList,
      emptyItems,
      itemCount,
      generateButton,
      removeItem: (itemId) => {
        draftItems = draftItems.filter((item) => item.id !== itemId);
        renderDraft();
      },
    });
  }

  function hasDuplicate(name) {
    return draftItems.some(
      (item) => normalizeName(item.name) === normalizeName(name),
    );
  }

  function addItem(name, quantity, unit) {
    const cleanName = String(name || "").trim();
    const cleanUnit = String(unit || "").trim();
    const parsedQuantity = Number(quantity);

    if (!workSelect.value) {
      announce("Selecione uma obra antes de adicionar materiais.");
      return false;
    }
    if (
      !cleanName ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      !cleanUnit
    ) {
      announce("Informe nome, quantidade maior que zero e unidade válida.");
      return false;
    }
    if (hasDuplicate(cleanName)) {
      announce(
        `${cleanName} já está na lista. Ajuste a quantidade no item existente.`,
      );
      return false;
    }

    draftItems.push({
      id: crypto.randomUUID(),
      name: cleanName,
      quantity: String(parsedQuantity),
      unit: cleanUnit,
    });
    announce(`${cleanName} adicionado ao pedido.`);
    renderDraft();
    return true;
  }

  function renderWorks() {
    const snapshot = readWorksSnapshot();
    const works = snapshot.works;
    const previousId = workSelect.value;
    workSelect.replaceChildren(createOption("", "Selecione uma obra"));
    works.forEach((work) => {
      workSelect.append(createOption(work.id, work.name));
    });

    const selectedStillExists = works.some(
      (work) => work.id === selectedWorkId,
    );
    if (selectedStillExists) workSelect.value = selectedWorkId;
    else if (works.some((work) => work.id === previousId))
      workSelect.value = previousId;

    const hasWorks = works.length > 0;
    noWorks.hidden = hasWorks;
    builder.hidden = !hasWorks;
    if (!hasWorks) {
      selectedWorkId = "";
      clearDraft();
      if (!snapshot.ok) {
        noWorksTitle.textContent = "Não foi possível ler as obras";
        noWorksMessage.textContent =
          "Os dados salvos foram preservados. O pedido não pode ser montado até que o armazenamento possa ser lido.";
        noWorksLink.hidden = true;
        announce(snapshot.error);
      } else if (snapshot.invalidRecords.length) {
        noWorksTitle.textContent = "Nenhuma obra válida disponível";
        noWorksMessage.textContent =
          "Há registros de obra inválidos. Eles foram preservados e não podem ser usados no pedido. Revise a seção Obras antes de continuar.";
        noWorksLink.hidden = false;
        announce(
          `${snapshot.invalidRecords.length} registro(s) inválido(s) foram preservados e não podem ser selecionados.`,
        );
      } else {
        noWorksTitle.textContent = "Cadastre uma obra para começar";
        noWorksMessage.textContent =
          "O pedido de materiais precisa estar associado a uma obra cadastrada.";
        noWorksLink.hidden = false;
      }
    } else if (selectedWorkId && !selectedStillExists) {
      selectedWorkId = "";
      workSelect.value = "";
      clearDraft();
      announce(
        "A obra selecionada não está mais disponível. Selecione outra obra.",
      );
    } else if (snapshot.invalidRecords.length) {
      announce(
        `${snapshot.invalidRecords.length} registro(s) de obra inválido(s) foram preservados e não podem ser selecionados.`,
      );
    }
  }

  setupCatalogForms(categorySelect, catalogItemSelect, catalogForm, addItem);
  setupManualForm(manualForm, addItem);

  workSelect.addEventListener("change", () => {
    const nextWorkId = workSelect.value;
    if (
      (draftItems.length > 0 || notesInput.value.trim()) &&
      selectedWorkId &&
      nextWorkId !== selectedWorkId
    ) {
      const shouldClear = window.confirm(
        "Trocar de obra vai limpar os materiais e observações deste pedido temporário. Deseja continuar?",
      );
      if (!shouldClear) {
        workSelect.value = selectedWorkId;
        return;
      }
      clearDraft();
    }
    selectedWorkId = nextWorkId;
    announce("");
  });

  generateButton.addEventListener("click", () => {
    const work = readWorksSnapshot().works.find(
      (entry) => entry.id === workSelect.value,
    );
    if (!work) {
      announce("Selecione uma obra cadastrada antes de gerar o documento.");
      renderWorks();
      return;
    }
    if (!draftIsValid(workSelect.value, draftItems)) {
      announce(
        "Revise os materiais: cada item precisa de nome, quantidade maior que zero e unidade.",
      );
      return;
    }

    buildPrintDocument(printDocument, work, draftItems, notesInput.value);
    printDocument.hidden = false;
    printDocument.setAttribute("aria-hidden", "false");
    document.body.classList.add("printing-materials");
    document.title = `pedido-materiais-${slugify(work.name)}`;

    const restoreAfterPrint = () => {
      printDocument.hidden = true;
      printDocument.setAttribute("aria-hidden", "true");
      document.body.classList.remove("printing-materials");
      document.title = originalTitle;
      announce(
        "Documento pronto. Na janela de impressão, escolha Salvar como PDF.",
      );
    };
    window.addEventListener("afterprint", restoreAfterPrint, { once: true });
    window.print();
  });

  window.addEventListener("obracontrol:data-changed", renderWorks);
  renderWorks();
  renderDraft();
}
