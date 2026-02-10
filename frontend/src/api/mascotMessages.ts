export interface MascotMessage {
  id: string;
  text: string;
  context: string; // e.g., 'home', 'onboarding', 'error'
  type?: "info" | "warning" | "success";
  image?: string;
}

export const FALLBACK_MESSAGES: MascotMessage[] = [
  {
    id: "welcome-1",
    text: "Welcome back! Let me know if you need help tracking your expenses.",
    context: "home",
    type: "info",
  },
  {
    id: "welcome-2",
    text: "Try adding a new transaction to keep your records up to date!",
    context: "home",
    type: "info",
  },
  {
    id: "generic-1",
    text: "I am here to help you manage your finances.",
    context: "generic",
    type: "info",
  },
  {
    id: "generic-2",
    text: "Today seems like a great day to review your finances!",
    context: "generic",
    type: "info",
  },
  {
    id: "offline-1",
    text: "You seem to be offline. Don't worry, you can still add transactions!",
    context: "offline",
    type: "warning",
    image: "/mascot-thinking.jpg",
  },
];
