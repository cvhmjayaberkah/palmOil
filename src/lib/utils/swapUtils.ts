// Utility functions for swap operations (non-server actions)

import {
  SwapGroupData,
  OldItemData,
  ReplacementItemData,
} from "../actions/swaps";

// Helper function to calculate total difference for swap groups
export function calculateSwapGroupsDifference(
  swapGroups: SwapGroupData[]
): number {
  let totalDifference = 0;

  for (const group of swapGroups) {
    const oldTotal = group.oldItems.reduce(
      (sum: number, item: OldItemData) => sum + item.cogs * item.quantity,
      0
    );
    const replacementTotal = group.replacementItems.reduce(
      (sum: number, item: ReplacementItemData) =>
        sum + item.cogs * item.quantity,
      0
    );
    totalDifference += replacementTotal - oldTotal;
  }

  return totalDifference;
}

// Legacy adapter: Convert old UI format to new SwapGroupData format
export function convertLegacySwapData(
  oldItems: Array<{ oldItemId: string; quantity: number; costPerItem: number }>,
  replacementItems: Array<{
    replacementItemId: string;
    quantity: number;
    pricePerItem: number;
  }>
): SwapGroupData[] {
  // For backward compatibility, create individual groups for each old-replacement pair
  // This maintains 1:1 relationship but allows future enhancement

  const swapGroups: SwapGroupData[] = [];

  // Strategy 1: If counts match, create 1:1 pairs
  if (oldItems.length === replacementItems.length) {
    for (let i = 0; i < oldItems.length; i++) {
      const oldItem = oldItems[i];
      const replacementItem = replacementItems[i];

      swapGroups.push({
        oldItems: [
          {
            itemId: oldItem.oldItemId,
            quantity: oldItem.quantity,
            cogs: oldItem.costPerItem,
          },
        ],
        replacementItems: [
          {
            itemId: replacementItem.replacementItemId,
            quantity: replacementItem.quantity,
            cogs: replacementItem.pricePerItem,
          },
        ],
        groupNotes: `Swap ${i + 1}: 1:1 replacement`,
      });
    }
  }
  // Strategy 2: If more old items than replacements, group old items
  else if (
    oldItems.length > replacementItems.length &&
    replacementItems.length === 1
  ) {
    swapGroups.push({
      oldItems: oldItems.map(item => ({
        itemId: item.oldItemId,
        quantity: item.quantity,
        cogs: item.costPerItem,
      })),
      replacementItems: [
        {
          itemId: replacementItems[0].replacementItemId,
          quantity: replacementItems[0].quantity,
          cogs: replacementItems[0].pricePerItem,
        },
      ],
      groupNotes: `Many-to-one: ${oldItems.length} old items to 1 replacement`,
    });
  }
  // Strategy 3: If more replacements than old items, group replacements
  else if (replacementItems.length > oldItems.length && oldItems.length === 1) {
    swapGroups.push({
      oldItems: [
        {
          itemId: oldItems[0].oldItemId,
          quantity: oldItems[0].quantity,
          cogs: oldItems[0].costPerItem,
        },
      ],
      replacementItems: replacementItems.map(item => ({
        itemId: item.replacementItemId,
        quantity: item.quantity,
        cogs: item.pricePerItem,
      })),
      groupNotes: `One-to-many: 1 old item to ${replacementItems.length} replacements`,
    });
  }
  // Strategy 4: Complex many-to-many (fallback to 1:1 mapping with remainder)
  else {
    const maxLength = Math.max(oldItems.length, replacementItems.length);

    for (let i = 0; i < maxLength; i++) {
      const oldItem = oldItems[i];
      const replacementItem = replacementItems[i];

      const group: SwapGroupData = {
        oldItems: [],
        replacementItems: [],
        groupNotes: `Complex swap group ${i + 1}`,
      };

      if (oldItem) {
        group.oldItems.push({
          itemId: oldItem.oldItemId,
          quantity: oldItem.quantity,
          cogs: oldItem.costPerItem,
        });
      }

      if (replacementItem) {
        group.replacementItems.push({
          itemId: replacementItem.replacementItemId,
          quantity: replacementItem.quantity,
          cogs: replacementItem.pricePerItem,
        });
      }

      swapGroups.push(group);
    }
  }

  return swapGroups;
}

// Helper function to create example swap scenarios for testing
export function createSwapScenarios() {
  // Scenario 1: Simple 1:1 swap
  const scenario1: SwapGroupData = {
    oldItems: [{ itemId: "product1", quantity: 2, cogs: 100000 }],
    replacementItems: [{ itemId: "product2", quantity: 2, cogs: 120000 }],
    groupNotes: "Simple 1:1 replacement",
  };

  // Scenario 2: 2 old items to 1 replacement (2:1)
  const scenario2: SwapGroupData = {
    oldItems: [
      { itemId: "product1", quantity: 1, cogs: 100000 },
      { itemId: "product3", quantity: 1, cogs: 80000 },
    ],
    replacementItems: [{ itemId: "product4", quantity: 1, cogs: 200000 }],
    groupNotes: "2 old items combined for 1 replacement",
  };

  // Scenario 3: 1 old item to 2 replacements (1:2)
  const scenario3: SwapGroupData = {
    oldItems: [{ itemId: "product5", quantity: 1, cogs: 500000 }],
    replacementItems: [
      { itemId: "product6", quantity: 2, cogs: 150000 },
      { itemId: "product7", quantity: 1, cogs: 200000 },
    ],
    groupNotes: "1 expensive item split into 2 cheaper items",
  };

  // Scenario 4: Many-to-Many (3:2)
  const scenario4: SwapGroupData = {
    oldItems: [
      { itemId: "product8", quantity: 2, cogs: 150000 },
      { itemId: "product9", quantity: 1, cogs: 100000 },
      { itemId: "product10", quantity: 1, cogs: 80000 },
    ],
    replacementItems: [
      { itemId: "product11", quantity: 2, cogs: 200000 },
      { itemId: "product12", quantity: 1, cogs: 180000 },
    ],
    groupNotes: "Complex many-to-many replacement",
  };

  return {
    scenario1,
    scenario2,
    scenario3,
    scenario4,
  };
}
