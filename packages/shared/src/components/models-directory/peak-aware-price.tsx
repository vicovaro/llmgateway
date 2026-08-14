import { resolvePricingDisplay } from "@llmgateway/models";

import type { ApiModelProviderMapping } from "./api-types";
import type { ProviderModelMapping } from "@llmgateway/models";
import type { ReactNode } from "react";

type DisplayField = "inputPrice" | "outputPrice" | "cachedInputPrice";

type DisplayMapping = Pick<
	ProviderModelMapping,
	"inputPrice" | "outputPrice" | "cachedInputPrice" | "peakPricing"
>;

// Structural subset shared by every API mapping type (apps/ui, playground, ...)
// — keeps resolveApiMappingPricingDisplay usable with older local API types
// that carry the base price fields plus an optional peakPricing block.
interface PeakAwareMappingInput {
	inputPrice: string | null;
	outputPrice: string | null;
	cachedInputPrice: string | null;
	peakPricing?: ApiModelProviderMapping["peakPricing"];
}

function toDisplayMapping(mapping: PeakAwareMappingInput): DisplayMapping {
	return {
		inputPrice: mapping.inputPrice ?? undefined,
		outputPrice: mapping.outputPrice ?? undefined,
		cachedInputPrice: mapping.cachedInputPrice ?? undefined,
		peakPricing: mapping.peakPricing
			? {
					effectiveAt: mapping.peakPricing.effectiveAt,
					hoursUtc: mapping.peakPricing.hoursUtc,
					peak: {
						inputPrice: mapping.peakPricing.peak.inputPrice,
						outputPrice: mapping.peakPricing.peak.outputPrice,
						cachedInputPrice:
							mapping.peakPricing.peak.cachedInputPrice ?? undefined,
					},
					offPeak: {
						inputPrice: mapping.peakPricing.offPeak.inputPrice,
						outputPrice: mapping.peakPricing.offPeak.outputPrice,
						cachedInputPrice:
							mapping.peakPricing.offPeak.cachedInputPrice ?? undefined,
					},
				}
			: undefined,
	};
}

/**
 * Resolve the pricing an API-sourced mapping should display right now.
 * Flat mappings (and mappings before `effectiveAt`) return the base flat
 * rates; on/after `effectiveAt` the peak/off-peak rate pair applies.
 */
export function resolveApiMappingPricingDisplay(
	mapping: PeakAwareMappingInput,
	now: Date = new Date(),
) {
	return resolvePricingDisplay(toDisplayMapping(mapping), now);
}

// "Peak 01:00-04:00 & 06:00-10:00 UTC". `hoursUtc` entries are half-open
// [start, end) UTC hour ranges.
export function formatPeakHoursUtc(
	hoursUtc: readonly [number, number][],
): string {
	const windows = hoursUtc.map(([start, end]) => {
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(start)}:00-${pad(end)}:00`;
	});
	return `Peak ${windows.join(" & ")} UTC`;
}

/**
 * Renders one price field of a mapping. Flat mappings (and mappings before
 * `effectiveAt`) render exactly like before; peak/off-peak mappings show the
 * off-peak rate as the primary number with the peak rate next to it, labelled.
 * `formatPrice` receives the already-adjusted price string (multiplier applied)
 * and must bind any discount itself.
 */
export function PeakAwarePriceValue({
	mapping,
	field,
	formatPrice,
	multiplier = 1,
}: {
	mapping: ApiModelProviderMapping;
	field: DisplayField;
	formatPrice: (price: string) => ReactNode;
	multiplier?: number;
}) {
	const display = resolvePricingDisplay(toDisplayMapping(mapping), new Date());
	const renderValue = (value: string | undefined) => {
		if (value === undefined) {
			return "—";
		}
		const adjusted =
			multiplier !== 1 ? String(Number(value) * multiplier) : value;
		return formatPrice(adjusted);
	};
	if (display.kind === "flat") {
		return <>{renderValue(display[field])}</>;
	}
	return (
		<span
			className="inline-flex flex-wrap items-center justify-end gap-x-1"
			title={formatPeakHoursUtc(display.hoursUtc)}
		>
			<span className="whitespace-nowrap">
				{renderValue(display.offPeak[field])}
				<span className="text-muted-foreground/70 text-[10px]"> off-peak</span>
			</span>
			<span className="text-muted-foreground/60">/</span>
			<span className="whitespace-nowrap">
				{renderValue(display.peak[field])}
				<span className="text-muted-foreground/70 text-[10px]"> peak</span>
			</span>
		</span>
	);
}

/**
 * Label / value / unit cell (same layout as the flat `PriceCell`) that renders
 * peak/off-peak rates once `effectiveAt` passes; the unit line carries the UTC
 * peak windows. `formatPrice` receives the already-adjusted price string.
 */
export function PeakAwarePriceCell({
	label,
	mapping,
	field,
	unit,
	formatPrice,
	multiplier = 1,
}: {
	label: string;
	mapping: ApiModelProviderMapping;
	field: DisplayField;
	unit: string;
	formatPrice: (price: string) => ReactNode;
	multiplier?: number;
}) {
	const display = resolvePricingDisplay(toDisplayMapping(mapping), new Date());
	const renderValue = (value: string | undefined) => {
		if (value === undefined) {
			return "—";
		}
		const adjusted =
			multiplier !== 1 ? String(Number(value) * multiplier) : value;
		return formatPrice(adjusted);
	};
	return (
		<div className="text-center">
			<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
				{label}
			</div>
			<div className="font-semibold text-foreground text-sm tabular-nums">
				{display.kind === "flat" ? (
					renderValue(display[field])
				) : (
					<span className="inline-flex flex-wrap items-center justify-center gap-x-1">
						<span className="whitespace-nowrap">
							{renderValue(display.offPeak[field])}
							<span className="text-muted-foreground/70 text-[10px]">
								{" "}
								off-peak
							</span>
						</span>
						<span className="text-muted-foreground/60">/</span>
						<span className="whitespace-nowrap">
							{renderValue(display.peak[field])}
							<span className="text-muted-foreground/70 text-[10px]">
								{" "}
								peak
							</span>
						</span>
					</span>
				)}
			</div>
			<div className="text-[10px] text-muted-foreground">
				{display.kind === "peak-off-peak"
					? `${unit} · ${formatPeakHoursUtc(display.hoursUtc)}`
					: unit}
			</div>
		</div>
	);
}
