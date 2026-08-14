import { describe, expect, it } from "vitest";

import { resolvePricingDisplay, resolveTimeBasedPricing } from "./helpers.js";

import type { ProviderModelMapping } from "./models.js";

const peakPricedMapping = {
	inputPrice: "0.14e-6",
	outputPrice: "0.28e-6",
	cachedInputPrice: "0.0028e-6",
	peakPricing: {
		effectiveAt: "2026-08-16T16:00:00Z",
		peak: {
			inputPrice: "0.44e-6",
			outputPrice: "1.32e-6",
			cachedInputPrice: "0.014e-6",
		},
		offPeak: {
			inputPrice: "0.22e-6",
			outputPrice: "0.66e-6",
			cachedInputPrice: "0.007e-6",
		},
		hoursUtc: [
			[1, 4],
			[6, 10],
		],
	},
} satisfies Pick<
	ProviderModelMapping,
	"inputPrice" | "outputPrice" | "cachedInputPrice" | "peakPricing"
>;

const at = (iso: string) => new Date(iso);

describe("resolveTimeBasedPricing", () => {
	it("returns the base prices unchanged when the mapping has no peakPricing", () => {
		const mapping = {
			inputPrice: "0.14e-6",
			outputPrice: "0.28e-6",
			cachedInputPrice: "0.0028e-6",
		} satisfies Pick<
			ProviderModelMapping,
			"inputPrice" | "outputPrice" | "cachedInputPrice"
		>;

		expect(
			resolveTimeBasedPricing(mapping, at("2026-08-17T02:00:00Z")),
		).toEqual({
			inputPrice: "0.14e-6",
			outputPrice: "0.28e-6",
			cachedInputPrice: "0.0028e-6",
		});
	});

	it.each([
		["01:00", "2026-08-17T01:00:00Z"],
		["03:59", "2026-08-17T03:59:00Z"],
		["06:00", "2026-08-17T06:00:00Z"],
		["09:59", "2026-08-17T09:59:00Z"],
	])("applies peak rates during peak hours (%s)", (_label, iso) => {
		expect(resolveTimeBasedPricing(peakPricedMapping, at(iso))).toEqual({
			inputPrice: "0.44e-6",
			outputPrice: "1.32e-6",
			cachedInputPrice: "0.014e-6",
		});
	});

	it.each([
		["00:59", "2026-08-17T00:59:00Z"],
		["04:00", "2026-08-17T04:00:00Z"],
		["05:59", "2026-08-17T05:59:00Z"],
		["10:00", "2026-08-17T10:00:00Z"],
		["23:59", "2026-08-17T23:59:00Z"],
	])("applies off-peak rates outside the peak window (%s)", (_label, iso) => {
		expect(resolveTimeBasedPricing(peakPricedMapping, at(iso))).toEqual({
			inputPrice: "0.22e-6",
			outputPrice: "0.66e-6",
			cachedInputPrice: "0.007e-6",
		});
	});

	const effectiveAtMapping = {
		inputPrice: "0.14e-6",
		outputPrice: "0.28e-6",
		cachedInputPrice: "0.0028e-6",
		peakPricing: {
			effectiveAt: "2026-08-16T16:00:00Z",
			peak: {
				inputPrice: "0.44e-6",
				outputPrice: "1.32e-6",
				cachedInputPrice: "0.014e-6",
			},
			offPeak: {
				inputPrice: "0.22e-6",
				outputPrice: "0.66e-6",
				cachedInputPrice: "0.007e-6",
			},
			hoursUtc: [
				[1, 4],
				[6, 10],
			],
		},
	} satisfies Pick<
		ProviderModelMapping,
		"inputPrice" | "outputPrice" | "cachedInputPrice" | "peakPricing"
	>;

	it("returns the base (regular) prices before effectiveAt", () => {
		expect(
			resolveTimeBasedPricing(effectiveAtMapping, at("2026-08-16T15:59:00Z")),
		).toEqual({
			inputPrice: "0.14e-6",
			outputPrice: "0.28e-6",
			cachedInputPrice: "0.0028e-6",
		});
		expect(
			resolveTimeBasedPricing(effectiveAtMapping, at("2026-08-16T16:00:00Z")),
		).toEqual({
			inputPrice: "0.22e-6",
			outputPrice: "0.66e-6",
			cachedInputPrice: "0.007e-6",
		}); // at effectiveAt — off-peak rates apply
		expect(
			resolveTimeBasedPricing(effectiveAtMapping, at("2026-08-16T17:00:00Z")),
		).toEqual({
			inputPrice: "0.22e-6",
			outputPrice: "0.66e-6",
			cachedInputPrice: "0.007e-6",
		}); // off-peak hour on effective date — off-peak rates
		expect(
			resolveTimeBasedPricing(effectiveAtMapping, at("2026-08-17T02:00:00Z")),
		).toEqual({
			inputPrice: "0.44e-6",
			outputPrice: "1.32e-6",
			cachedInputPrice: "0.014e-6",
		}); // peak hour after effectiveAt — peak rates
	});

	it("returns undefined peak cached rate when peakPricing omits it", () => {
		const mapping = {
			inputPrice: "0.14e-6",
			outputPrice: "0.28e-6",
			peakPricing: {
				effectiveAt: "2026-08-16T16:00:00Z",
				peak: {
					inputPrice: "0.44e-6",
					outputPrice: "1.32e-6",
				},
				offPeak: {
					inputPrice: "0.22e-6",
					outputPrice: "0.66e-6",
				},
				hoursUtc: [[1, 4]],
			},
		} satisfies Pick<
			ProviderModelMapping,
			"inputPrice" | "outputPrice" | "cachedInputPrice" | "peakPricing"
		>;

		expect(
			resolveTimeBasedPricing(mapping, at("2026-08-17T02:00:00Z")),
		).toEqual({
			inputPrice: "0.44e-6",
			outputPrice: "1.32e-6",
			cachedInputPrice: undefined,
		});
	});
});

describe("resolvePricingDisplay", () => {
	it("returns flat base prices when the mapping has no peakPricing", () => {
		const mapping = {
			inputPrice: "0.14e-6",
			outputPrice: "0.28e-6",
			cachedInputPrice: "0.0028e-6",
		} satisfies Pick<
			ProviderModelMapping,
			"inputPrice" | "outputPrice" | "cachedInputPrice"
		>;

		expect(resolvePricingDisplay(mapping, at("2026-08-17T02:00:00Z"))).toEqual({
			kind: "flat",
			inputPrice: "0.14e-6",
			outputPrice: "0.28e-6",
			cachedInputPrice: "0.0028e-6",
		});
	});

	it("returns flat base prices before effectiveAt", () => {
		expect(
			resolvePricingDisplay(peakPricedMapping, at("2026-08-16T15:59:00Z")),
		).toEqual({
			kind: "flat",
			inputPrice: "0.14e-6",
			outputPrice: "0.28e-6",
			cachedInputPrice: "0.0028e-6",
		});
	});

	it("keeps absent flat prices undefined instead of inventing a zero", () => {
		const mapping = {
			outputPrice: "0.28e-6",
		} satisfies Pick<
			ProviderModelMapping,
			"inputPrice" | "outputPrice" | "cachedInputPrice"
		>;

		expect(resolvePricingDisplay(mapping, at("2026-08-17T02:00:00Z"))).toEqual({
			kind: "flat",
			inputPrice: undefined,
			outputPrice: "0.28e-6",
			cachedInputPrice: undefined,
		});
	});

	it("returns peak/off-peak rates from effectiveAt onward, regardless of the hour", () => {
		expect(
			resolvePricingDisplay(peakPricedMapping, at("2026-08-16T16:00:00Z")),
		).toEqual({
			kind: "peak-off-peak",
			offPeak: {
				inputPrice: "0.22e-6",
				outputPrice: "0.66e-6",
				cachedInputPrice: "0.007e-6",
			},
			peak: {
				inputPrice: "0.44e-6",
				outputPrice: "1.32e-6",
				cachedInputPrice: "0.014e-6",
			},
			hoursUtc: [
				[1, 4],
				[6, 10],
			],
			effectiveAt: "2026-08-16T16:00:00Z",
		});
		// Same shape at a peak hour — the display exposes both rates, the
		// caller never has to re-derive them from the current hour.
		expect(
			resolvePricingDisplay(peakPricedMapping, at("2026-08-17T02:00:00Z")),
		).toMatchObject({ kind: "peak-off-peak" });
	});

	it("preserves undefined cached rate in peak/off-peak blocks when omitted", () => {
		const mapping = {
			inputPrice: "0.14e-6",
			outputPrice: "0.28e-6",
			peakPricing: {
				effectiveAt: "2026-08-16T16:00:00Z",
				peak: {
					inputPrice: "0.44e-6",
					outputPrice: "1.32e-6",
				},
				offPeak: {
					inputPrice: "0.22e-6",
					outputPrice: "0.66e-6",
				},
				hoursUtc: [[1, 4]],
			},
		} satisfies Pick<
			ProviderModelMapping,
			"inputPrice" | "outputPrice" | "cachedInputPrice" | "peakPricing"
		>;

		const display = resolvePricingDisplay(mapping, at("2026-08-17T02:00:00Z"));
		expect(display.kind).toBe("peak-off-peak");
		if (display.kind === "peak-off-peak") {
			expect(display.offPeak.cachedInputPrice).toBeUndefined();
			expect(display.peak.cachedInputPrice).toBeUndefined();
		}
	});
});
