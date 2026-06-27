export interface User {
  id: string;
  username: string;
  name: string;
  role: 'super_admin' | 'admin' | 'staff';
  email: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  category: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  gstRate: number; // percentage, e.g. 18 for 18%
  gstAmount: number;
  discount: number; // flat discount per item
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  paymentMode: 'cash' | 'card' | 'upi' | 'credit';
  date: string;
  createdBy: string;
}

export interface CustomerSupplier {
  id: string;
  type: 'customer' | 'supplier';
  name: string;
  phone: string;
  email: string;
  currentBalance: number; // positive = they owe us (customer) or we owe them (supplier)
}

export interface LedgerTransaction {
  id: string;
  entityId: string; // customerId or supplierId
  type: 'debit' | 'credit'; // debit = increases balance, credit = decreases balance
  amount: number;
  balanceAfter: number;
  description: string;
  date: string;
}

// Initial mock data
const INITIAL_USERS: User[] = [
  { id: '1', username: 'superadmin', name: 'Rahul Nair', role: 'super_admin', email: 'rahul@billingapp.com' },
  { id: '2', username: 'admin', name: 'Faisal K.V.', role: 'admin', email: 'faisal@billingapp.com' },
  { id: '3', username: 'staff', name: 'Jithin Das', role: 'staff', email: 'jithin@billingapp.com' }
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Basmati Rice Premium 5kg', sku: 'RICE-BAS-05', barcode: '8901234567890', purchasePrice: 420, sellingPrice: 550, stock: 45, category: 'Groceries' },
  { id: 'p2', name: 'Coconut Oil 1 Litre', sku: 'COCO-OIL-01', barcode: '8901234567891', purchasePrice: 180, sellingPrice: 220, stock: 8, category: 'Oils & Ghee' },
  { id: 'p3', name: 'Tata Tea Premium 1kg', sku: 'TEA-TATA-01', barcode: '8901234567892', purchasePrice: 310, sellingPrice: 380, stock: 60, category: 'Beverages' },
  { id: 'p4', name: 'Aashirvaad Shudh Chakki Atta 10kg', sku: 'ATTA-AAS-10', barcode: '8901234567893', purchasePrice: 390, sellingPrice: 480, stock: 5, category: 'Groceries' },
  { id: 'p5', name: 'Dettol Liquid Handwash 750ml', sku: 'DET-HW-750', barcode: '8901234567894', purchasePrice: 110, sellingPrice: 149, stock: 24, category: 'Hygiene' },
  { id: 'p6', name: 'Surf Excel Easy Wash 1kg', sku: 'SURF-EX-01', barcode: '8901234567895', purchasePrice: 130, sellingPrice: 165, stock: 15, category: 'Household' }
];

const INITIAL_CONTACTS: CustomerSupplier[] = [
  { id: 'c1', type: 'customer', name: 'Anil Kumar', phone: '9847012345', email: 'anil@gmail.com', currentBalance: 450 },
  { id: 'c2', type: 'customer', name: 'Sreedevi Haridas', phone: '9847054321', email: 'sree@gmail.com', currentBalance: 0 },
  { id: 's1', type: 'supplier', name: 'Malabar Distributors', phone: '9447098765', email: 'info@malabardist.com', currentBalance: 12500 },
  { id: 's2', type: 'supplier', name: 'Peevees Groceries Wholesale', phone: '9447123456', email: 'contact@peevees.com', currentBalance: 0 }
];

const INITIAL_TRANSACTIONS: LedgerTransaction[] = [
  { id: 't1', entityId: 'c1', type: 'debit', amount: 450, balanceAfter: 450, description: 'Credit purchase on Invoice #INV-1001', date: '2026-06-25T14:30:00Z' },
  { id: 't2', entityId: 's1', type: 'debit', amount: 12500, balanceAfter: 12500, description: 'Purchase of Groceries Stock Batch #99', date: '2026-06-24T10:15:00Z' }
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-1001',
    customerId: 'c1',
    customerName: 'Anil Kumar',
    items: [
      { productId: 'p1', name: 'Basmati Rice Premium 5kg', qty: 1, price: 550, gstRate: 5, gstAmount: 26.19, discount: 0, total: 550 }
    ],
    subtotal: 523.81,
    taxAmount: 26.19,
    discountAmount: 0,
    grandTotal: 550,
    paidAmount: 100,
    balance: 450,
    paymentMode: 'credit',
    date: '2026-06-25T14:30:00Z',
    createdBy: 'Faisal K.V.'
  }
];

// LocalStorage helpers with fallback seeding
export const getFromStorage = <T>(key: string, initialData: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initialData));
    return initialData;
  }
  try {
    return JSON.parse(data) as T;
  } catch {
    return initialData;
  }
};

export const saveToStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Database class
export class DB {
  static getUsers(): User[] {
    return getFromStorage('users', INITIAL_USERS);
  }

  static saveUsers(users: User[]): void {
    saveToStorage('users', users);
  }

  static getProducts(): Product[] {
    return getFromStorage('products', INITIAL_PRODUCTS);
  }

  static saveProducts(products: Product[]): void {
    saveToStorage('products', products);
  }

  static getContacts(): CustomerSupplier[] {
    return getFromStorage('contacts', INITIAL_CONTACTS);
  }

  static saveContacts(contacts: CustomerSupplier[]): void {
    saveToStorage('contacts', contacts);
  }

  static getTransactions(): LedgerTransaction[] {
    return getFromStorage('transactions', INITIAL_TRANSACTIONS);
  }

  static saveTransactions(transactions: LedgerTransaction[]): void {
    saveToStorage('transactions', transactions);
  }

  static getInvoices(): Invoice[] {
    return getFromStorage('invoices', INITIAL_INVOICES);
  }

  static saveInvoices(invoices: Invoice[]): void {
    saveToStorage('invoices', invoices);
  }

  static resetDatabase(): void {
    localStorage.setItem('users', JSON.stringify(INITIAL_USERS));
    localStorage.setItem('products', JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem('contacts', JSON.stringify(INITIAL_CONTACTS));
    localStorage.setItem('transactions', JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem('invoices', JSON.stringify(INITIAL_INVOICES));
  }
}
