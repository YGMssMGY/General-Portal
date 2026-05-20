import { useState, useEffect, useMemo } from "react";
import { ComboBox, InlineLoading } from "@carbon/react";
import { fetchJson } from "../../api/httpClient";
import type { Member } from "../../types";

interface MemberOption {
	id: string;
	label: string;
	subtitle: string;
}

export interface MemberSelectChange {
	id: string | undefined;
	label: string | undefined;
}

interface MemberSelectProps {
	value: string | undefined;
	onChange: (change: MemberSelectChange) => void;
	label: string;
	placeholder?: string;
	invalid?: boolean;
	invalidText?: string;
}

export function MemberSelect({
	value,
	onChange,
	label,
	placeholder,
	invalid,
	invalidText,
}: MemberSelectProps) {
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

	const selectedItem = useMemo(() => items.find((i) => i.id === value) ?? null, [items, value]);

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
		<ComboBox<MemberOption>
			id="member-select"
			titleText={label}
			placeholder={placeholder ?? "Select a member..."}
			items={items}
			selectedItem={selectedItem}
			onChange={({ selectedItem }) =>
				onChange({
					id: selectedItem?.id ?? undefined,
					label: selectedItem?.label ?? undefined,
				})
			}
			itemToString={(item) => (item ? item.label : "")}
			itemToElement={(item) => (
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
			invalid={invalid}
			invalidText={invalidText}
		/>
	);
}
