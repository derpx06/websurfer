const BORDER_ID = 'webgenie-agent-border';
const BORDER_STYLE_ID = 'webgenie-agent-border-style';

const BORDER_CSS = `
#${BORDER_ID} {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 2147483646;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
}

#${BORDER_ID}.active {
    opacity: 1;
}

#${BORDER_ID}::before {
    content: "";
    position: absolute;
    inset: 4px; /* Slightly inside the viewport bounds for a clean outline */
    border: 4px solid transparent;
    border-radius: 24px; /* Premium rounded edges */
    background: linear-gradient(135deg, #00f2ff 0%, #7000ff 50%, #00f2ff 100%) border-box;
    -webkit-mask:
        linear-gradient(#fff 0 0) padding-box, 
        linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    box-shadow: 0 0 15px rgba(0, 242, 255, 0.4), inset 0 0 15px rgba(112, 0, 255, 0.4);
    filter: drop-shadow(0 0 8px rgba(0, 242, 255, 0.5));
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
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: rgba(15, 15, 20, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 9999px;
  padding: 12px 28px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  font-weight: 600;
  z-index: 2147483647;
  box-shadow: 
    0 10px 40px -10px rgba(0, 0, 0, 0.8), 
    0 0 20px rgba(0, 242, 255, 0.2), 
    0 0 40px rgba(112, 0, 255, 0.15);
  transition: transform 0.7s cubic-bezier(0.2, 1, 0.2, 1), opacity 0.5s ease;
  pointer-events: none;
  opacity: 0;
  max-width: 400px; /* Limit the max width */
}

#${CAPSULE_ID}.active {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

#${CAPSULE_ID}::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: 9999px;
  padding: 1px;
  background: linear-gradient(90deg, #00f2ff, #7000ff, #ff00f7, #00f2ff);
  background-size: 300% 300%;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: bg-move 4s linear infinite;
  opacity: 0.9;
}

#${CAPSULE_ID}::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15);
  pointer-events: none;
}

.webgenie-status-dot {
  width: 10px;
  height: 10px;
  background: #00f2ff;
  border-radius: 50%;
  box-shadow: 0 0 12px 2px rgba(0, 242, 255, 0.8), inset 0 0 4px #fff;
  animation: webgenie-status-pulse 1.5s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

.webgenie-status-text {
  letter-spacing: 0.03em;
  background: linear-gradient(135deg, #ffffff 0%, #b3b3b3 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  z-index: 2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

@keyframes webgenie-status-pulse {
  0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 8px rgba(0, 242, 255, 0.8); }
  50% { transform: scale(1.3); opacity: 0.7; box-shadow: 0 0 16px rgba(0, 242, 255, 1); }
}

@keyframes bg-move {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
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
