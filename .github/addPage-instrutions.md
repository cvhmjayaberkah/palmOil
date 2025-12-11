I want to create a CRUD page from this database:

## Database

1.  **`swaps`**

    - `id`
    - `invoice_id`
    - `swap_date`
    - `status` (e.g., 'pending', 'completed', 'canceled')

2.  **`swap_details`**
    - `id`
    - `swap_id`
    - `old_item_id`
    - `replacement_item_id`
    - `old_item_cogs`
    - `replacement_item_cogs`

## Reference

Consistance layout and style will reference the folder page "/inventori/produksi"
Use custom UI from Components/UI

## I want to make modul customer

In the Sidebar Page, it will be named the "Tukar Guling" module. The page created will be placed at the path "sales/tukar" and read on layout.tsx will contain this data:
const myStaticData = {
module: "sales",
subModule: "tukar",
allowedRole: ["OWNER", "ADMIN"],
data: await getCategories(), // adjust according to the data retrieval
};

### Main Features:

- Automatic Value Comparison: The system automatically compares the value of the old item with the replacement item to ensure its value is equal to or greater. This eliminates manual errors and ensures transaction integrity.

- Automatic Invoice Update: Once the transaction is approved, the system automatically updates the existing invoice instead of creating a new one. This is highly efficient and reduces the admin's workload.

- Transaction History: This feature records all completed swap transactions. It simplifies auditing and tracking.

### Data Storage:

Save to swaps and swap_details
and update invoce_items with new swap items

### Example Scenarios:

The admin selects the invoice to be processed for the swap. The system displays the details of the items on that invoice. The admin chooses which item will be swapped. The system shows a list of available items for the swap. The admin selects a replacement item.
The application compares the COGS of both items to ensure the value condition is met.

If the condition is met, the admin approves the transaction. The system then updates the same invoice by removing the old item and adding the replacement item.

Make everything complete so that it can CRUD the data.
