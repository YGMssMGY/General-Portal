export interface ClientConfig {
	displayName: string;
	shortName: string;
	tagline: string;
	description: string;
	favicon: string;
	primaryColor: string;
	secondaryColor: string;
	features: {
		showFinance: boolean;
		showVolunteers: boolean;
		showProposals: boolean;
		showFiles: boolean;
		showActivity: boolean;
		showMembers: boolean;
		showSettings: boolean;
		showMeetings: boolean;
	};
}

const clients: Record<string, ClientConfig> = {
	developers: {
		displayName: "Developers' Club",
		shortName: "DC",
		tagline: "Code. Create. Collaborate.",
		description: "A community of student developers building innovative projects.",
		favicon: "/developers.png",
		primaryColor: "#0f62fe",
		secondaryColor: "#0043ce",
		features: {
			showFinance: false,
			showVolunteers: true,
			showProposals: true,
			showFiles: true,
			showActivity: true,
			showMembers: false,
			showSettings: false,
			showMeetings: true,
		},
	},
	stuco: {
		displayName: "Student Council",
		shortName: "SC",
		tagline: "Leading with purpose.",
		description: "Student council management and event coordination.",
		favicon: "/stuco.png",
		primaryColor: "#8b3b8b",
		secondaryColor: "#6f2d6f",
		features: {
			showFinance: true,
			showVolunteers: false,
			showProposals: true,
			showFiles: true,
			showActivity: true,
			showMembers: true,
			showSettings: true,
			showMeetings: true,
		},
	},
};

const defaultClient: ClientConfig = clients.developers;

export function getClientConfig(): ClientConfig {
	const name = import.meta.env.VITE_CLIENT_NAME || "developers";
	return clients[name] || defaultClient;
}
