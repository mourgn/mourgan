
// DOM-based autoscroll for recent winnings
(function() {
  function init() {
    const container = document.querySelector('.recent-list, .recent-winnings, .recent-container');
    if (!container) return false;
    // Mutation observer for new children
    const observer = new MutationObserver(() => {
      // sanitize text nodes
      for (const node of Array.from(container.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent.replace(/\s+/g, '');
          if (t === '' || t === '/n' || t === '\\n') node.remove();
        }
      }
      try {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } catch(e) {
        container.scrollTop = container.scrollHeight;
      }
    });
    observer.observe(container, { childList: true });
    // Initial scroll
    setTimeout(() => {
      try { container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }); } catch(e) {}
    }, 200);
    return true;
  }
  // Attempt init repeatedly
  let tries = 0;
  const iv = setInterval(() => {
    if (init() || ++tries > 20) clearInterval(iv);
  }, 250);
})();
