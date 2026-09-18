const CLARITY_SCRIPT_ID = 'microsoft-clarity';
type ClarityCommand = ((...args: unknown[]) => void) & { q?: unknown[][] };
const SENSITIVE_SELECTOR = [
  'input[type="password"]',
  'input[type="email"]',
  'input[type="tel"]',
  'textarea',
  '[autocomplete="one-time-code"]',
  '[autocomplete="current-password"]',
  '[autocomplete="new-password"]',
  '[name*="address" i]',
  '[name*="email" i]',
  '[name*="phone" i]',
  '[name*="password" i]',
  '[name*="token" i]',
  '[name*="transaction" i]',
  '[name*="reference" i]',
].join(',');

const maskSensitiveFields = (root: ParentNode = document) => {
  root.querySelectorAll<HTMLElement>(SENSITIVE_SELECTOR).forEach(element => {
    element.setAttribute('data-clarity-mask', 'true');
  });
};

export const initializeClarity = () => {
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim();

  if (!import.meta.env.PROD || !projectId || document.getElementById(CLARITY_SCRIPT_ID)) return;

  maskSensitiveFields();
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(SENSITIVE_SELECTOR)) node.setAttribute('data-clarity-mask', 'true');
      maskSensitiveFields(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const clarityWindow = window as Window & { clarity?: ClarityCommand };
  if (!clarityWindow.clarity) {
    const clarity: ClarityCommand = (...args: unknown[]) => {
      (clarity.q ??= []).push(args);
    };
    clarityWindow.clarity = clarity;
  }

  const script = document.createElement('script');
  script.id = CLARITY_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  script.referrerPolicy = 'strict-origin-when-cross-origin';
  document.head.appendChild(script);
};
