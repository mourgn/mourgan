
// autoscroll_polished.js
// Observe recent list, prepend new entries visually (move DOM node to top), animate with glow and stagger, and sync scroll.
// This script avoids touching React internals beyond DOM reorder; it's cautious and retries if elements not found immediately.

(function(){
  const WIN_COLOR_CLASS = 'mourgan-glow-win';
  const LOSS_COLOR_CLASS = 'mourgan-glow-loss';
  const NEW_ENTRY_CLASS = 'mourgan-new-entry';
  const GLOW_ANIM_CLASS = 'mourgan-glow-anim';
  const SETTLE_CLASS = 'mourgan-settle';

  function findContainer() {
    const selectors = ['.recent-list', '.recent-winnings', '.recent-container', '.mourgan-hide-scroll'];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    // try to find by heading
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span'));
    for (const h of headings) {
      if (h.textContent && /recent/i.test(h.textContent.trim())) {
        if (h.nextElementSibling && h.nextElementSibling.children.length>=1) return h.nextElementSibling;
      }
    }
    return null;
  }

  function detectWinOrLoss(node) {
    try {
      const text = node.textContent || '';
      // look for a number with optional minus sign
      const m = text.match(/-?\d+(\.\d+)?/);
      if (!m) return null;
      const val = parseFloat(m[0]);
      if (isNaN(val)) return null;
      return val < 0 ? 'loss' : (val > 0 ? 'win' : 'neutral');
    } catch(e){ return null; }
  }

  function computeDelays(n) {
    // progressive easing delays - first faster, later slower, cap total spacing
    const maxPer = 400; // max ms per item
    const base = 80; // base fast gap
    const delays = [];
    for (let i=0;i<n;i++){
      const t = i / Math.max(1, n-1); // 0..1
      // easeInOutCubic for progression
      const eased = t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
      const d = Math.round(base + eased * (maxPer - base));
      delays.push(d);
    }
    return delays;
  }

  function animateNodes(container, nodes) {
    if (!nodes.length) return;
    const delays = computeDelays(nodes.length);
    nodes.forEach((node, idx) => {
      // move node to top to make newest first
      try {
        container.insertBefore(node, container.firstChild);
      } catch(e){}
      // prepare animation classes
      node.classList.add(NEW_ENTRY_CLASS);
      node.classList.add(GLOW_ANIM_CLASS);
      // determine win/loss
      const kind = detectWinOrLoss(node);
      if (kind === 'win') node.classList.add(WIN_COLOR_CLASS);
      else if (kind === 'loss') node.classList.add(LOSS_COLOR_CLASS);
      // staggered timing via setTimeout
      const delay = delays[idx];
      node.style.animationDelay = (delay/1000) + 's';
      // schedule settling (scale settle and remove glow after linger)
      setTimeout(()=>{
        node.classList.add(SETTLE_CLASS);
        // after glow linger (1.2s) remove glow class to fade it gracefully
        setTimeout(()=>{
          node.classList.remove(WIN_COLOR_CLASS);
          node.classList.remove(LOSS_COLOR_CLASS);
          node.classList.remove(GLOW_ANIM_CLASS);
        }, 1200);
      }, delay + 600); // after animation complete (600ms) start settle and linger removal
    });

    // scroll the container to top smoothly after a short delay to sync with animations
    const totalDelay = delays[delays.length-1] + 600;
    setTimeout(()=>{
      try { container.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){ container.scrollTop = 0; }
    }, 50); // small initial delay to ensure layout updated
  }

  function init() {
    const container = findContainer();
    if (!container) return false;
    // make sure it stretches
    container.style.display = container.style.display || 'flex';
    container.style.flexDirection = 'column';
    container.style.overflowY = 'auto';
    container.style.scrollBehavior = 'smooth';
    // hide native scrollbar instantly via style (redundant with CSS)
    container.style.msOverflowStyle = 'none';
    container.style.scrollbarWidth = 'none';

    // observe additions
    const observer = new MutationObserver((mutations)=>{
      const added = [];
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) {
            added.push(n);
          }
        }
      }
      if (added.length) {
        animateNodes(container, added);
      }
    });
    observer.observe(container, { childList: true });

    // initial cleanup: remove stray text nodes and ensure scrolled to top
    for (const node of Array.from(container.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.replace(/\s+/g,'');
        if (!t) node.remove();
      }
    }
    // initial scroll to top (show newest if pre-existing prepended nodes)
    try { container.scrollTo({ top: 0 }); } catch(e){ container.scrollTop = 0; }
    return true;
  }

  // try init until success
  let tries = 0;
  const iv = setInterval(()=>{
    if (init() || ++tries>40) clearInterval(iv);
  }, 200);
})();
