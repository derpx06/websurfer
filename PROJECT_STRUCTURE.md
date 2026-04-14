# WebSurfer Project Structure

WebSurfer is a modern, modular Monorepo browser extension built for agentic web navigation and LLM-driven interactions. The repository uses `pnpm` workspaces and is broken down into modular chunks for scalability, UI sharing, and distinct background script management.

This document breaks down the project structure into distinct functional modules.

## Architecture & Modules Overview

The monorepo is grouped into three main primary modules:
1. **`chrome-extension/`**: The core extension lifecycles and background worker logic.
2. **`pages/`**: The decoupled React-based User Interfaces for different extension views.
3. **`packages/`**: Shared libraries, core data stores, UI components, and utilities used by the apps.

---

### 1. The Core Extension Runtime (`/chrome-extension/`)
This is the heart of the agentic processing and where background executions happen.
- **`src/background/agent/`**: Contains the Executor, Action Builder, and Human-In-The-Loop processing cycles. This is the background "brain" running the LLM inferences while the browser navigates.
- **`src/background/task/`**: Task Manager that brokers requests between the UI side panels and the agent executor.
- **`manifest.js` / `vite.config.mts`**: Configuration to bundle the background scripts into the final extension.

### 2. Frontend UIs (`/pages/`)
Contains all the separate React applications that function as different views for the browser extension. These are highly decoupled and styled using Tailwind, integrating the `ui-ux-pro-max` design system.
- **`pages/side-panel/`**: The primary user-facing interface. Contains the chatbot chat UI, history lists, and HITL (Human-in-the-Loop) pauses where the user injects interactions directly to the agent.
- **`pages/options/`**: The settings dashboard. Built with a premium glassmorphic UI. Contains sub-components for **Model Settings**, **Firewall Rules**, **Analytics**, and **General Preferences** for fine-tuning API keys and agent behavior.
- **`pages/content/`**: The content script injected into every loaded webpage. This module is responsible for reading the DOM recursively (`buildDomTree.js`), overlaying bounds/highlights, and executing click/type actions seamlessly.

### 3. Shared Internal Packages (`/packages/`)
These act as Node packages used across the repo, abstracting logic out of the UI components.
- **`packages/storage/`**: Centralized persistent state management built over `chrome.storage`. Contains configurations for LLM Providers (`llmProviderStore`), Firewall Rules, Prompts, and Agent models.
- **`packages/ui/`**: A shared UI component library preventing duplication of basic buttons, inputs, and layout wrappers across Option and Side Panel pages.
- **`packages/i18n/`**: Fully configured internationalization module holding the localized strings (`t()`).
- **`packages/hmr/` & `packages/dev-utils/`**: Tooling for hot-module-reloading during the rapid iteration development cycle.
- **`packages/schema-utils/` & `packages/shared/`**: Common types, TypeScript interfaces, error boundaries, and shared logic wrappers utilized by all clients.

---

## Development Workflow & Code Flow

1. **User interacts in the Frontends (`pages/side-panel`)** targeting an objective.
2. The UI pushes a message/status to the **Background Scripts (`chrome-extension/src/background`)**.
3. Background Scripts communicate with the active injected webpage via **Content Scripts (`pages/content`)** to extract screen context.
4. The background invokes LLMs using endpoints configured and persisted in the **Storage Module (`packages/storage`)**.
5. Complex tasks utilize HITL pausing, triggering an update back up to the Side Panel UI to prompt the user.

## Styling System
All UI components use a unified **Tailwind CSS** configuration exported by `packages/tailwind-config/`, allowing identical styling logic across isolated view endpoints. The UI relies heavily on modern glassmorphism, dynamic gradients, and SVG micro-interactions.
