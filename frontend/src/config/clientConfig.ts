export interface ClientConfig {
  displayName: string;
  shortName: string;
  tagline: string;
  description: string;
  primaryColor: string;
  features: {
    showFinance: boolean;
    showVolunteers: boolean;
  };
}

const clients: Record<string, ClientConfig> = {
  developers: {
    displayName: "Developers' Club",
    shortName: "DC",
    tagline: "Code. Create. Collaborate.",
    description: "A community of student developers building innovative projects.",
    primaryColor: "#0043ce",
    features: { showFinance: false, showVolunteers: true },
  },
  stuco: {
    displayName: "Student Council",
    shortName: "SC",
    tagline: "Leading with purpose.",
    description: "Student council management and event coordination.",
    primaryColor: "#0043ce",
    features: { showFinance: true, showVolunteers: false },
  },
};

const defaultClient: ClientConfig = clients.developers;

export function getClientConfig(): ClientConfig {
  const name = import.meta.env.VITE_CLIENT_NAME || "developers";
  return clients[name] || defaultClient;
}
