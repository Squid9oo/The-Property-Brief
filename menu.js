/* ========================================
   THE PROPERTY BRIEF — Shared Menu Logic
   Hamburger menu toggle for all pages
======================================== */

/**
 * Initialize hamburger menu toggle
 * @param {string} hamburgerId - ID of hamburger button
 * @param {string} navId - ID of nav element
 */
export function initHamburgerMenu(hamburgerId, navId) {
  const hamburger = document.getElementById(hamburgerId);
  const mainNav = document.getElementById(navId);

  if (!hamburger || !mainNav) return;

  // Toggle menu on hamburger click
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mainNav.classList.toggle('active');
  });
  
  // Close menu when clicking nav links
  const navLinks = mainNav.querySelectorAll('a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mainNav.classList.remove('active');
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const clickedInside = hamburger.contains(e.target) || mainNav.contains(e.target);
    if (!clickedInside && mainNav.classList.contains('active')) {
      hamburger.classList.remove('active');
      mainNav.classList.remove('active');
    }
  });
  
  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav.classList.contains('active')) {
      hamburger.classList.remove('active');
      mainNav.classList.remove('active');
    }
  });
}