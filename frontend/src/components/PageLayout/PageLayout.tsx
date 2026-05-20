import type { ReactNode } from "react";
import { Grid, Column } from "@carbon/react";
import { PageHeader } from "../PageHeader";

interface PageLayoutProps {
	title: string;
	description?: string | ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
}

export function PageLayout({ title, description, actions, children, className }: PageLayoutProps) {
	return (
		<Grid className={className}>
			<Column lg={16} md={8} sm={4}>
				<PageHeader title={title} description={description} actions={actions} />
				{children}
			</Column>
		</Grid>
	);
}
