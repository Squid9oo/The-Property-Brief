/**
 * THE PROPERTY BRIEF - Shared Menu Component
 * Hamburger menu logic used across all pages
 * Last updated: 2026-02-09 (robust version)
 */

(function() {
  'use strict';

  /**
   * Initialize hamburger menu toggle
   * @param {string} hamburgerId - ID of the hamburger button element
   * @param {string} navId - ID of the navigation element
   */
  function initHamburgerMenu(hamburgerId, navId) {
    const hamburger = document.getElementById(hamburgerId);
    const nav = document.getElementById(navId);

    if (!hamburger || !nav) {
      console.warn(`Menu initialization skipped: ${hamburgerId} or ${navId} not found`);
      return;
    }

    console.log(`✓ Menu initialized: ${hamburgerId} → ${navId}`);

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = hamburger.classList.toggle('active');
      nav.classList.toggle('active');
      console.log(`Menu ${isActive ? 'opened' : 'closed'}`);
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
  /**
   * Initialize Tools dropdown toggle (works on all pages)
   */
  function initToolsDropdown() {
    const dropdowns = document.querySelectorAll('.toolsDropdown');
    if (!dropdowns.length) return;

    dropdowns.forEach(dropdown => {
      const btn = dropdown.querySelector('.toolsBtn');
      if (!btn) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(isOpen));
      });
    });

    document.addEventListener('click', (e) => {
      dropdowns.forEach(dropdown => {
        if (!dropdown.contains(e.target) && dropdown.classList.contains('open')) {
          dropdown.classList.remove('open');
          dropdown.querySelector('.toolsBtn')?.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdowns.forEach(dropdown => {
          if (dropdown.classList.contains('open')) {
            dropdown.classList.remove('open');
            dropdown.querySelector('.toolsBtn')?.setAttribute('aria-expanded', 'false');
          }
        });
      }
    });
  }

  /**
   * Initialize all menus
   */
  function initAllMenus() {
    console.log('Initializing hamburger menus...');
    
    // Homepage menu
    initHamburgerMenu('hamburger', 'mainNav');
    
    // Projects page menu
    initHamburgerMenu('hamburgerProjects', 'mainNavProjects');
    initToolsDropdown();
  }

  // Wait for DOM to be fully ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllMenus);
  } else {
    // DOM already loaded (happens with defer)
    initAllMenus();
  }

})();
