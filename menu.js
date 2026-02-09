/**
 * THE PROPERTY BRIEF - Shared Menu Component
 * Hamburger menu logic used across all pages
 * Last updated: 2026-02-09
 */

/**
 * Initialize hamburger menu toggle
 * @param {string} hamburgerId - ID of the hamburger button element
 * @param {string} navId - ID of the navigation element
 */
function initHamburgerMenu(hamburgerId, navId) {
  const hamburger = document.getElementById(hamburgerId);
  const nav = document.getElementById(navId);

  if (!hamburger || !nav) {
    console.warn(`Menu initialization failed: ${hamburgerId} or ${navId} not found`);
    return;
  }

  // Toggle menu on hamburger click
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburger.classList.toggle('active');
    nav.classList.toggle('active');
  });

  // Close menu when clicking nav links
  const navLinks = nav.querySelectorAll('a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const clickedInside = hamburger.contains(e.target) || nav.contains(e.target);
    if (!clickedInside && nav.classList.contains('active')) {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    }
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('active')) {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    }
  });
}

// Auto-initialize menus on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Homepage menu
    initHamburgerMenu('hamburger', 'mainNav');
    // Projects page menu
    initHamburgerMenu('hamburgerProjects', 'mainNavProjects');
  });
} else {
  // DOM already loaded
  initHamburgerMenu('hamburger', 'mainNav');
  initHamburgerMenu('hamburgerProjects', 'mainNavProjects');
}
