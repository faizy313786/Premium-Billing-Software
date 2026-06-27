import { DB, Invoice, InvoiceItem } from './db';
import { ProductService } from './productService';
import { LedgerService } from './ledgerService';

export class BillingService {
  static getInvoices(): Invoice[] {
    return DB.getInvoices();
  }

  static getNextInvoiceNumber(): string {
    const invoices = DB.getInvoices();
    if (invoices.length === 0) return 'INV-1001';
    
    // Extract max invoice number suffix
    const numbers = invoices.map(inv => {
      const match = inv.invoiceNumber.match(/INV-(\d+)/);
      return match ? parseInt(match[1], 10) : 1000;
    });
    const maxNum = Math.max(...numbers);
    return `INV-${maxNum + 1}`;
  }

  static createInvoice(invoiceData: {
    customerId: string;
    customerName: string;
    items: InvoiceItem[];
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    grandTotal: number;
    paidAmount: number;
    paymentMode: 'cash' | 'card' | 'upi' | 'credit';
    createdBy: string;
  }): Invoice {
    const invoices = DB.getInvoices();
    const invoiceNumber = this.getNextInvoiceNumber();
    const balance = invoiceData.paymentMode === 'credit' 
      ? invoiceData.grandTotal - invoiceData.paidAmount 
      : 0;

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber,
      date: new Date().toISOString(),
      balance,
      ...invoiceData
    };

    // 1. Decrement Stock for all items
    for (const item of invoiceData.items) {
      ProductService.decrementStock(item.productId, item.qty);
    }

    // 2. If it's a credit sale (or paid amount is less than total) and customer is valid
    if (invoiceData.customerId && invoiceData.customerId !== 'walkin') {
      if (invoiceData.paymentMode === 'credit' && balance > 0) {
        // Add credit entry to ledger
        LedgerService.addTransaction({
          entityId: invoiceData.customerId,
          type: 'debit', // they owe us more
          amount: balance,
          description: `Unpaid dues on Invoice #${invoiceNumber}`
        });
      }
    }

    // 3. Save Invoice
    invoices.push(newInvoice);
    DB.saveInvoices(invoices);

    return newInvoice;
  }
}
