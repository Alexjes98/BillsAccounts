export interface MascotMessage {
  id: string;
  text: string;
  context: string; // e.g., 'home', 'onboarding', 'error'
  type?: "info" | "warning" | "success";
  image?: string;
}

export const FALLBACK_MESSAGES: MascotMessage[] = [
  {
    id: "onboarding-0",
    text: "Welcome friend. Let's create your user, don't worry your data won't leave your device. ",
    context: "onboarding",
    type: "info",
  },
  {
    id: "onboarding-1",
    text: "You can add more later on, for now select the basic accounts you use frequently.",
    context: "onboarding",
    type: "info",
  },
  {
    id: "onboarding-2",
    text: "Persons will serve as reference for debts and credits.",
    context: "onboarding",
    type: "info",
  },
  {
    id: "onboarding-3",
    text: "Is recomended that you create categories for usual expenses and incomes to keep things organized",
    context: "onboarding",
    type: "info",
  },
  {
    id: "onboarding-4",
    text: "All set, let's start tracking your expenses!",
    context: "onboarding",
    type: "info",
  },
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
    id: "generic-3",
    text: "Remember to backup your data from time to time. You can do it in your profile settings.",
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
