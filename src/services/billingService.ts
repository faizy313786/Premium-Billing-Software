import { DB, Invoice, InvoiceItem } from './db';
import { ProductService } from './productService';
import { LedgerService } from './ledgerService';

const API_URL = 'http://localhost:8080/api/invoices';

export class BillingService {
  static async getInvoices(): Promise<Invoice[]> {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        return await response.json() as Invoice[];
      }
    } catch (e) {
      console.warn('Backend Invoices API offline, falling back to LocalStorage:', e);
    }
    return DB.getInvoices();
  }

  static async getNextInvoiceNumber(): Promise<string> {
    const invoices = await this.getInvoices();
    if (invoices.length === 0) return 'INV-1001';
    
    const numbers = invoices.map(inv => {
      const match = inv.invoiceNumber.match(/INV-(\d+)/);
      return match ? parseInt(match[1], 10) : 1000;
    });
    const maxNum = Math.max(...numbers);
    return `INV-${maxNum + 1}`;
  }

  static async createInvoice(invoiceData: {
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
  }): Promise<Invoice> {
    const nextNum = await this.getNextInvoiceNumber();
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '',
          invoiceNumber: nextNum,
          customerId: invoiceData.customerId,
          customerName: invoiceData.customerName,
          items: invoiceData.items,
          subtotal: invoiceData.subtotal,
          taxAmount: invoiceData.taxAmount,
          discountAmount: invoiceData.discountAmount,
          grandTotal: invoiceData.grandTotal,
          paidAmount: invoiceData.paidAmount,
          balance: invoiceData.paymentMode === 'credit' ? invoiceData.grandTotal - invoiceData.paidAmount : 0,
          paymentMode: invoiceData.paymentMode,
          date: new Date().toISOString(),
          createdBy: invoiceData.createdBy
        })
      });
      if (response.ok) {
        return await response.json() as Invoice;
      }
    } catch (e) {
      console.warn('Backend Invoices API offline, executing LocalStorage flow:', e);
    }

    // Offline Fallback Flow
    const invoices = DB.getInvoices();
    const balance = invoiceData.paymentMode === 'credit' 
      ? invoiceData.grandTotal - invoiceData.paidAmount 
      : 0;

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber: nextNum,
      date: new Date().toISOString(),
      balance,
      ...invoiceData
    };

    // Decrement stock
    for (const item of invoiceData.items) {
      ProductService.decrementStock(item.productId, item.qty);
    }

    // Update customer ledger
    if (invoiceData.customerId && invoiceData.customerId !== 'walkin' && invoiceData.paymentMode === 'credit' && balance > 0) {
      LedgerService.addTransaction({
        entityId: invoiceData.customerId,
        type: 'debit',
        amount: balance,
        description: `Unpaid dues on Invoice #${nextNum}`
      });
    }

    invoices.push(newInvoice);
    DB.saveInvoices(invoices);
    return newInvoice;
  }
}
