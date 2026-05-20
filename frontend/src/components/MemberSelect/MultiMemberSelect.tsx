import { useState, useEffect, useMemo } from "react";
import { FilterableMultiSelect, InlineLoading } from "@carbon/react";
import { fetchJson } from "../../api/httpClient";
import type { Member } from "../../types";

interface MemberOption {
	id: string;
	label: string;
	subtitle: string;
}

interface MultiMemberSelectProps {
	value: string[] | undefined;
	onChange: (ids: string[]) => void;
	label: string;
	placeholder?: string;
	titleText?: string;
}

export function MultiMemberSelect({
	value,
	onChange,
	label,
	placeholder,
	titleText,
}: MultiMemberSelectProps) {
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>();

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(undefined);
		fetchJson<Member[]>("/members")
			.then((data) => {
				if (!cancelled) {
					setMembers(data);
					setLoading(false);
				}
			})
			.catch((e) => {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : "Failed to load members");
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const items: MemberOption[] = useMemo(
		() =>
			members.map((m) => ({
				id: m.id,
				label: m.user?.displayName || m.id,
				subtitle: m.user?.email || "",
			})),
		[members],
	);

	const selectedItems = useMemo(() => items.filter((i) => value?.includes(i.id)), [items, value]);

	if (loading) {
		return (
			<div style={{ padding: "0.5rem 0" }}>
				<InlineLoading description="Loading members..." />
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					fontSize: "0.875rem",
					color: "var(--cds-support-error)",
					padding: "0.5rem 0",
				}}
			>
				{error}
			</div>
		);
	}

	return (
		<FilterableMultiSelect<MemberOption>
			id="multi-member-select"
			titleText={titleText || label}
			placeholder={placeholder ?? "Search members..."}
			items={items}
			selectedItems={selectedItems}
			onChange={({ selectedItems }) => onChange(selectedItems.map((s) => s.id))}
			itemToString={(item) => (item ? item.label : "")}
			itemToElement={(item: MemberOption) => (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						padding: "0.25rem 0",
					}}
				>
					<span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{item.label}</span>
					{item.subtitle ? (
						<span style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
							{item.subtitle}
						</span>
					) : null}
				</div>
			)}
		/>
	);
}
