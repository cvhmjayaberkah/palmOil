import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedExpenses() {

  // Create sample expense transactions
  const expenseData = [
    {
      transactionDate: new Date('2025-01-15'),
      type: 'EXPENSE' as const,
      amount: 5000000,
      description: 'Pembelian peralatan kantor dan supplies untuk operasional',
      category: 'Operasional',
      reference: 'INV-2025-001',
      transactionItems: {
        create: [
          {
            description: 'Komputer Desktop',
            quantity: 2,
            price: 8000000,
            totalPrice: 16000000,
          },
          {
            description: 'Office Supplies',
            quantity: 1,
            price: 1000000,
            totalPrice: 1000000,
          },
        ],
      },
    },
    {
      transactionDate: new Date('2025-01-10'),
      type: 'EXPENSE' as const,
      amount: 15000000,
      description: 'Gaji karyawan bulan Januari 2025',
      category: 'Gaji & Tunjangan',
      reference: 'PAYROLL-JAN-2025',
      transactionItems: {
        create: [
          {
            description: 'Gaji Pokok',
            quantity: 10,
            price: 12000000,
            totalPrice: 120000000,
          },
          {
            description: 'Tunjangan',
            quantity: 10,
            price: 3000000,
            totalPrice: 30000000,
          },
        ],
      },
    },
    {
      transactionDate: new Date('2025-01-12'),
      type: 'EXPENSE' as const,
      amount: 2500000,
      description: 'Biaya transportasi dan pengiriman produk',
      category: 'Transport',
      reference: 'TRANS-2025-003',
      transactionItems: {
        create: [
          {
            description: 'Biaya Pengiriman',
            quantity: 5,
            price: 500000,
            totalPrice: 2500000,
          },
        ],
      },
    },
    {
      transactionDate: new Date('2025-01-08'),
      type: 'EXPENSE' as const,
      amount: 1200000,
      description: 'Pembayaran listrik, air, dan internet kantor',
      category: 'Utilitas',
      reference: 'UTIL-JAN-2025',
      transactionItems: {
        create: [
          {
            description: 'Listrik',
            quantity: 1,
            price: 800000,
            totalPrice: 800000,
          },
          {
            description: 'Air',
            quantity: 1,
            price: 200000,
            totalPrice: 200000,
          },
          {
            description: 'Internet',
            quantity: 1,
            price: 400000,
            totalPrice: 400000,
          },
        ],
      },
    },
    {
      transactionDate: new Date('2025-01-14'),
      type: 'EXPENSE' as const,
      amount: 8000000,
      description: 'Pembelian bahan baku untuk produksi',
      category: 'Bahan Baku',
      reference: 'BB-2025-005',
      transactionItems: {
        create: [
          {
            description: 'Minyak Mentah',
            quantity: 100,
            price: 75000,
            totalPrice: 7500000,
          },
          {
            description: 'Kemasan',
            quantity: 1000,
            price: 500,
            totalPrice: 500000,
          },
        ],
      },
    },
    {
      transactionDate: new Date('2025-01-05'),
      type: 'EXPENSE' as const,
      amount: 3000000,
      description: 'Biaya marketing dan promosi produk',
      category: 'Marketing',
      reference: 'MKT-2025-002',
      transactionItems: {
        create: [
          {
            description: 'Iklan Online',
            quantity: 1,
            price: 2000000,
            totalPrice: 2000000,
          },
          {
            description: 'Brosur dan Banner',
            quantity: 1,
            price: 1000000,
            totalPrice: 1000000,
          },
        ],
      },
    },
    {
      transactionDate: new Date('2025-01-20'),
      type: 'EXPENSE' as const,
      amount: 1500000,
      description: 'Pemeliharaan mesin dan peralatan produksi',
      category: 'Pemeliharaan',
      reference: 'MAINT-2025-001',
      transactionItems: {
        create: [
          {
            description: 'Service Mesin',
            quantity: 2,
            price: 600000,
            totalPrice: 1200000,
          },
          {
            description: 'Spare Parts',
            quantity: 1,
            price: 300000,
            totalPrice: 300000,
          },
        ],
      },
    },
    {
      transactionDate: new Date('2025-01-18'),
      type: 'EXPENSE' as const,
      amount: 800000,
      description: 'Biaya administrasi dan legal',
      category: 'Administrasi',
      reference: 'ADM-2025-004',
      transactionItems: {
        create: [
          {
            description: 'Biaya Notaris',
            quantity: 1,
            price: 500000,
            totalPrice: 500000,
          },
          {
            description: 'Biaya Administrasi',
            quantity: 1,
            price: 300000,
            totalPrice: 300000,
          },
        ],
      },
    },
    // December 2024 data for comparison
    {
      transactionDate: new Date('2024-12-28'),
      type: 'EXPENSE' as const,
      amount: 12000000,
      description: 'Gaji karyawan bulan Desember 2024',
      category: 'Gaji & Tunjangan',
      reference: 'PAYROLL-DEC-2024',
      transactionItems: {
        create: [
          {
            description: 'Gaji Pokok',
            quantity: 10,
            price: 10000000,
            totalPrice: 100000000,
          },
          {
            description: 'Bonus Akhir Tahun',
            quantity: 10,
            price: 2000000,
            totalPrice: 20000000,
          },
        ],
      },
    },
    {
      transactionDate: new Date('2024-12-15'),
      type: 'EXPENSE' as const,
      amount: 6000000,
      description: 'Pembelian bahan baku akhir tahun',
      category: 'Bahan Baku',
      reference: 'BB-2024-012',
      transactionItems: {
        create: [
          {
            description: 'Minyak Mentah',
            quantity: 80,
            price: 75000,
            totalPrice: 6000000,
          },
        ],
      },
    },
  ];

  for (const expense of expenseData) {
    await prisma.transactions.create({
      data: expense,
    });
  }

}

export default seedExpenses;
