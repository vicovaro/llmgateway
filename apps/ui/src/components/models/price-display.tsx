import { resolvePricingDisplay } from "@llmgateway/models";

import type { ProviderModelMapping } from "@llmgateway/models";
import type { ReactNode } from "react";

type PriceField = "inputPrice" | "outputPrice" | "cachedInputPrice";

export type MappingPriceFields = Pick<
	ProviderModelMapping,
	"inputPrice" | "outputPrice" | "cachedInputPrice" | "peakPricing"
>;

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

// "Peak 01:00-04:00 & 06:00-10:00 UTC". `hoursUtc` entries are half-open
// [start, end) UTC hour ranges.
export function formatPeakHoursUtc(
	hoursUtc: readonly [number, number][],
): string {
	const windows = hoursUtc.map(
		([start, end]) => `${pad2(start)}:00-${pad2(end)}:00`,
	);
	return `Peak ${windows.join(" & ")} UTC`;
}

/**
 * Renders one price field of a mapping using `resolvePricingDisplay`.
 * Flat mappings render exactly what `format` renders (unchanged behaviour);
 * peak/off-peak mappings show the off-peak rate as the primary number with
 * the peak rate next to it, labelled.
 */
export function PriceDisplay({
	mapping,
	field,
	format,
	now,
}: {
	mapping: MappingPriceFields;
	field: PriceField;
	format: (pricePerToken: string) => ReactNode;
	now?: Date;
}) {
	const display = resolvePricingDisplay(mapping, now);
	if (display.kind === "flat") {
		const value = display[field];
		return <>{value === undefined ? null : format(value)}</>;
	}
	const offPeak = display.offPeak[field];
	const peak = display.peak[field];
	return (
		<span className="inline-flex flex-wrap items-center gap-x-1">
			{offPeak !== undefined && (
				<span className="whitespace-nowrap">
					{format(offPeak)}
					<span className="text-muted-foreground/70 text-[10px]">
						{" "}
						off-peak
					</span>
				</span>
			)}
			{peak !== undefined && (
				<>
					<span className="text-muted-foreground/60">/</span>
					<span className="whitespace-nowrap">
						{format(peak)}
						<span className="text-muted-foreground/70 text-[10px]"> peak</span>
					</span>
				</>
			)}
		</span>
	);
}

/**
 * Small caption with the UTC peak windows, e.g. "Peak 01:00-04:00 &
 * 06:00-10:00 UTC". Render it next to a `PriceDisplay` whenever a
 * peak/off-peak mapping is shown.
 */
export function PeakHoursCaption({
	hoursUtc,
}: {
	hoursUtc: readonly [number, number][];
}) {
	return (
		<span className="text-muted-foreground/70 text-[10px]">
			{formatPeakHoursUtc(hoursUtc)}
		</span>
	);
}
