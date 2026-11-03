import { describe, expect, it } from "vitest";
import {
  channelAmountError,
  channelGroupLabel,
  estimateFeeIdr,
  isAmountAllowed,
  isOvoChannel,
} from "./channel-utils";
import type { PaymentChannel } from "@/lib/server/payments/types";

const qris: PaymentChannel = {
  code: "qris",
  name: "QRIS",
  type: "qris",
  group: "QRIS",
  flowType: "direct",
  feeMode: "merchant",
  feeFlat: 0,
  feePercent: 0,
  minAmount: 1_000,
  maxAmount: null,
};

const indomaret: PaymentChannel = {
  ...qris,
  code: "indomaret",
  name: "Indomaret",
  type: "cstore",
  group: "Gerai Ritel",
  minAmount: 15_000,
  maxAmount: 2_500_000,
};

const ovo: PaymentChannel = {
  ...qris,
  code: "ovo",
  name: "OVO",
  type: "ewallet",
  group: "E-Wallet",
  flowType: "redirect",
  minAmount: 10_000,
};

describe("channelGroupLabel", () => {
  it("derives the group from the type", () => {
    expect(channelGroupLabel({ type: "va", group: "Lainnya" })).toBe(
      "Virtual Account",
    );
    expect(channelGroupLabel({ type: "ewallet", group: "" })).toBe("E-Wallet");
  });

  it("falls back to the provider group and then Lainnya", () => {
    expect(channelGroupLabel({ type: "other", group: "Khusus" })).toBe(
      "Khusus",
    );
    expect(channelGroupLabel({ type: "other", group: "" })).toBe("Lainnya");
  });
});

describe("amount limits", () => {
  it("treats null maxAmount as unlimited", () => {
    expect(isAmountAllowed(qris, 1_000_000_000)).toBe(true);
    expect(channelAmountError(qris, 1_000_000_000)).toBeNull();
  });

  it("enforces minimum and maximum amounts", () => {
    expect(isAmountAllowed(indomaret, 14_999)).toBe(false);
    expect(isAmountAllowed(indomaret, 15_000)).toBe(true);
    expect(isAmountAllowed(indomaret, 2_500_001)).toBe(false);
    expect(channelAmountError(indomaret, 2_500_001)).toContain("maksimal");
    expect(channelAmountError(indomaret, 14_999)).toContain("Minimal");
  });
});

describe("fee estimate", () => {
  it("does not estimate a fee when the merchant pays it", () => {
    expect(estimateFeeIdr(qris, 100_000)).toBeNull();
  });

  it("estimates flat plus percent fees for customer/split modes", () => {
    expect(
      estimateFeeIdr(
        { feeMode: "customer", feeFlat: 2_500, feePercent: 0.7 },
        100_000,
      ),
    ).toBe(3_200);
    expect(
      estimateFeeIdr(
        { feeMode: "split", feeFlat: 0, feePercent: 3 },
        100_000,
      ),
    ).toBe(3_000);
  });
});

describe("OVO detection", () => {
  it("detects OVO by code or name", () => {
    expect(isOvoChannel(ovo)).toBe(true);
    expect(isOvoChannel({ code: "x", name: "OVO Cash" })).toBe(true);
    expect(isOvoChannel({ code: "dana", name: "DANA" })).toBe(false);
  });
});
