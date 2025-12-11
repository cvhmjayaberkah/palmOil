I want to create a CRUD page from this database:

## Database

```
model Deliveries {
  id              String         @id @default(cuid())
  deliveryCode     String         @unique
//add more column will need
  status          deliveryStatus  @default(PENDING)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  invoiceId       String
  userId          String
  invoice         Invoices       @relation(fields: [invoiceId], references: [id])
  user            Users          @relation(fields: [userId], references: [id])

  @@map("payments")
}
```

## Reference

Consistance layout and style will reference the folder page "/inventori/produksi"
Use custom UI from Components/UI

## application flow:

1.Sales Order Created.
2.PO Created.
3.Invoice Created.
4.Make delivery notes if needed 
5.Delivery Created
6.Payment an invoice.

## I want to make flow number 5

In the Sidebar Page, it will be named the "Pembayaran" module. The page created will be placed at the path "sales/pembayaran" and read on layout.tsx will contain this data:
const myStaticData = {
module: "sales",
subModule: "pembayaran",
allowedRole: ["OWNER", "ADMIN"],
data: await getCategories(), // adjust according to the data retrieval
};

### Main Features:

Choose payment in form create and add attachment then save into database,
and update column PaymentStatus in invoice table

### Data Storage:

Save to Payments and update Invoice PaymentStatus

### Example Scenarios:

Admin can create payment, and choose invoice want to pay, and fill nominal pay, nominal will auto fill suitable with totalAmount column in invoice

Admin can add attachment and others that need to be filled in the payment column

Make everything complete so that it can CRUD the data.