const BORDER_ID = 'webgenie-agent-border';
const BORDER_STYLE_ID = 'webgenie-agent-border-style';

const BORDER_CSS = `
@property --webgenie-gradient-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

#${BORDER_ID} {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483646;
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

#${BORDER_ID}.active {
  opacity: 1;
}

#${BORDER_ID}::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 0; /* Full edge hug */
  background: conic-gradient(
    from var(--webgenie-gradient-angle),
    #00f2ff, 
    #0062ff, 
    #001aff, 
    #7000ff, 
    #4e00c2, 
    #0062ff, 
    #00f2ff
  );
  animation: webgenie-rotate 2.5s linear infinite;
  
  /* The sharp, high-energy border line */
  mask: 
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: destination-out;
  padding: 2.5px; /* Slightly thinner, sharper border */
  filter: drop-shadow(0 0 2px rgba(0, 242, 255, 0.8));
  z-index: 2;
}

@keyframes webgenie-rotate {
  0% {
    --webgenie-gradient-angle: 0deg;
  }
  100% {
    --webgenie-gradient-angle: 360deg;
  }
}
`;

function injectBorder() {
  if (document.getElementById(BORDER_ID)) return;

  // Inject Style
  if (!document.getElementById(BORDER_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = BORDER_STYLE_ID;
    style.textContent = BORDER_CSS;
    document.head.appendChild(style);
  }

  // Inject Div
  const border = document.createElement('div');
  border.id = BORDER_ID;
  document.body.appendChild(border);
}

function setBorderActive(active: boolean) {
  const border = document.getElementById(BORDER_ID);
  if (active) {
    injectBorder();
    // Use a small timeout to ensure transition works
    setTimeout(() => {
      const el = document.getElementById(BORDER_ID);
      if (el) {
        el.classList.add('active');
      }
    }, 10);
  } else if (border) {
    border.classList.remove('active');
    // Hide after transition
    setTimeout(() => {
      if (!border.classList.contains('active')) {
        border.remove();
      }
    }, 500);
  }
}

const CAPSULE_ID = 'webgenie-status-capsule';
const CAPSULE_STYLE_ID = 'webgenie-status-capsule-style';

const EXTRA_CSS = `
#${CAPSULE_ID} {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: rgba(5, 5, 10, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 242, 255, 0.3);
  border-radius: 20px;
  padding: 8px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 13px;
  font-weight: 500;
  z-index: 2147483647;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 242, 255, 0.15);
  transition: transform 0.6s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.4s ease;
  pointer-events: none;
  opacity: 0;
  max-width: 85vw;
  border-bottom: 2px solid rgba(0, 242, 255, 0.2);
}

#${CAPSULE_ID}.active {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.webgenie-status-dot {
  width: 8px;
  height: 8px;
  background: #00f2ff;
  border-radius: 50%;
  box-shadow: 0 0 10px #00f2ff;
  animation: webgenie-status-pulse 2s ease-in-out infinite;
}

.webgenie-status-text {
  letter-spacing: 0.02em;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

@keyframes webgenie-status-pulse {
  0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 8px #00f2ff; }
  50% { transform: scale(1.2); opacity: 0.6; box-shadow: 0 0 15px #00f2ff; }
}
`;

function injectCapsule() {
  if (document.getElementById(CAPSULE_ID)) return;

  if (!document.getElementById(CAPSULE_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = CAPSULE_STYLE_ID;
    style.textContent = EXTRA_CSS;
    document.head.appendChild(style);
  }

  const capsule = document.createElement('div');
  capsule.id = CAPSULE_ID;
  capsule.innerHTML = `
        <div class="webgenie-status-dot"></div>
        <div class="webgenie-status-text" id="${CAPSULE_ID}-text">Initializing Agent...</div>
    `;
  document.body.appendChild(capsule);
}

function updateStatusUI(active: boolean, statusText?: string) {
  if (active) {
    injectCapsule();
    const capsule = document.getElementById(CAPSULE_ID);
    const textField = document.getElementById(`${CAPSULE_ID}-text`);

    if (textField) {
      // Clean up status text (capitalize first letter, handle common tool names)
      let displayStatus = statusText || 'Thinking...';
      if (displayStatus.includes('(')) {
        displayStatus = displayStatus.split('(')[0];
      }
      displayStatus = displayStatus.replace(/_/g, ' ');
      displayStatus = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);
      if (!displayStatus.endsWith('...')) displayStatus += '...';

      textField.textContent = displayStatus;
    }

    setTimeout(() => {
      if (capsule) capsule.classList.add('active');
    }, 10);
  } else {
    const capsule = document.getElementById(CAPSULE_ID);
    if (capsule) {
      capsule.classList.remove('active');
      setTimeout(() => {
        if (!capsule.classList.contains('active')) {
          capsule.remove();
        }
      }, 600);
    }
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'AGENT_STATUS') {
    setBorderActive(message.active);
    updateStatusUI(message.active, message.status);
  }
});
