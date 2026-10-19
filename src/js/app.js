import { setupBasicCalculator } from "./modules/calculadora/calculadora.js";

setupBasicCalculator();

const navigationLinks = document.querySelectorAll(".nav-link");

function updateActiveNavigation() {
  const currentHash = window.location.hash || "#inicio";

  navigationLinks.forEach((link) => {
    link.classList.toggle("is-active", link.hash === currentHash);
  });
}

window.addEventListener("hashchange", updateActiveNavigation);
updateActiveNavigation();
