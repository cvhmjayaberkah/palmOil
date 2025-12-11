"use server";

import {
  calculateSwapGroupsDifference,
  convertLegacySwapData,
} from "@/lib/utils/swapUtils";
import { createSwap, SwapData } from "./swaps";

// Enhanced version of createSwap that accepts legacy format
export async function createSwapLegacy(
  oldItems: Array<{ oldItemId: string; quantity: number; costPerItem: number }>,
  replacementItems: Array<{
    replacementItemId: string;
    quantity: number;
    pricePerItem: number;
  }>,
  swapData: Omit<SwapData, "swapGroups">
) {
  const swapGroups = convertLegacySwapData(oldItems, replacementItems);
  const difference = calculateSwapGroupsDifference(swapGroups);

  const completeSwapData: SwapData = {
    ...swapData,
    swapGroups,
    difference,
  };

  return createSwap(completeSwapData);
}
