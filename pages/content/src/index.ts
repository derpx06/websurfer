const BORDER_ID = 'nanobrowser-agent-border';
const BORDER_STYLE_ID = 'nanobrowser-agent-border-style';

const BORDER_CSS = `
@property --nanobrowser-gradient-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

#${BORDER_ID} {
  position: fixed;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 10px;
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
  inset: -1px;
  border-radius: 20px;
  background: conic-gradient(
    from var(--nanobrowser-gradient-angle),
    #00f2ff, 
    #0062ff, 
    #001aff, 
    #7000ff, 
    #4e00c2, 
    #0062ff, 
    #00f2ff
  );
  animation: nanobrowser-rotate 2.5s linear infinite;
  
  /* The sharp, high-energy border line */
  mask: 
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: destination-out;
  padding: 3px; /* Precise 3px thickness */
  filter: drop-shadow(0 0 2px rgba(0, 242, 255, 0.8));
  z-index: 2;
}

@keyframes nanobrowser-rotate {
  0% {
    --nanobrowser-gradient-angle: 0deg;
  }
  100% {
    --nanobrowser-gradient-angle: 360deg;
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

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'AGENT_STATUS') {
        setBorderActive(message.active);
    }
});
