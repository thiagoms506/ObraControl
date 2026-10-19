import {
  setupAreaCalculator,
  setupBasicCalculator,
  setupVolumeCalculator,
} from "./modules/calculadora/calculadora.js";
import { setupWorks } from "./modules/obras/obras.js";
import { setupExpenses } from "./modules/despesas/despesas.js";
import { setupReceipts } from "./modules/obras/recebimentos.js";
import { setupMaterialsOrders } from "./modules/materiais/pedidos.js";

setupBasicCalculator();
setupAreaCalculator();
setupVolumeCalculator();
setupReceipts();
setupExpenses();
setupWorks();
setupMaterialsOrders();

const navigationLinks = document.querySelectorAll(".nav-link");
const sidebar = document.querySelector(".sidebar");
const menuToggle = document.querySelector("#menu-toggle");
const mobileMenu = window.matchMedia("(max-width: 680px)");

function setMenuOpen(isOpen) {
  sidebar.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
}

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  setMenuOpen(!isOpen);
});

navigationLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (mobileMenu.matches) setMenuOpen(false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});

mobileMenu.addEventListener("change", (event) => {
  if (!event.matches) setMenuOpen(false);
});

function updateActiveNavigation() {
  const currentHash = window.location.hash || "#inicio";

  navigationLinks.forEach((link) => {
    link.classList.toggle("is-active", link.hash === currentHash);
  });
}

if (!window.location.hash) {
  const homeUrl = new URL(window.location.href);
  homeUrl.hash = "inicio";
  window.history.replaceState(null, "", homeUrl);
  document.querySelector("#inicio").scrollIntoView({ block: "start" });
}

window.addEventListener("hashchange", updateActiveNavigation);
updateActiveNavigation();
