import { DB, CustomerSupplier, LedgerTransaction } from './db';

export class LedgerService {
  static getContacts(): CustomerSupplier[] {
    return DB.getContacts();
  }

  static getCustomers(): CustomerSupplier[] {
    return DB.getContacts().filter(c => c.type === 'customer');
  }

  static getSuppliers(): CustomerSupplier[] {
    return DB.getContacts().filter(c => c.type === 'supplier');
  }

  static saveContact(contact: Omit<CustomerSupplier, 'id' | 'currentBalance'> & { id?: string; currentBalance?: number }): CustomerSupplier {
    const contacts = DB.getContacts();
    if (contact.id) {
      // Update
      const index = contacts.findIndex(c => c.id === contact.id);
      if (index !== -1) {
        contacts[index] = { 
          ...contacts[index], 
          ...contact,
          currentBalance: contact.currentBalance !== undefined ? contact.currentBalance : contacts[index].currentBalance
        };
      } else {
        throw new Error('Contact not found');
      }
      DB.saveContacts(contacts);
      return contacts[index];
    } else {
      // Create
      const newId = 'c_' + Date.now();
      const newContact: CustomerSupplier = { 
        id: newId, 
        currentBalance: contact.currentBalance || 0,
        ...contact
      };
      contacts.push(newContact);
      DB.saveContacts(contacts);
      return newContact;
    }
  }

  static deleteContact(id: string): void {
    const contacts = DB.getContacts();
    const updated = contacts.filter(c => c.id !== id);
    DB.saveContacts(updated);
    
    // Also delete associated transactions
    const txs = DB.getTransactions();
    const updatedTxs = txs.filter(t => t.entityId !== id);
    DB.saveTransactions(updatedTxs);
  }

  static getTransactionsForEntity(entityId: string): LedgerTransaction[] {
    const transactions = DB.getTransactions();
    return transactions
      .filter(t => t.entityId === entityId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  static addTransaction(txData: {
    entityId: string;
    type: 'debit' | 'credit';
    amount: number;
    description: string;
  }): LedgerTransaction {
    const contacts = DB.getContacts();
    const transactions = DB.getTransactions();

    const entityIndex = contacts.findIndex(c => c.id === txData.entityId);
    if (entityIndex === -1) {
      throw new Error('Customer or Supplier not found');
    }

    const entity = contacts[entityIndex];
    let newBalance = entity.currentBalance;

    // customer: debit = they owe us more (increases balance), credit = they pay us (decreases balance)
    // supplier: debit = we buy on credit (we owe them more), credit = we pay them (decreases balance)
    if (txData.type === 'debit') {
      newBalance += txData.amount;
    } else {
      newBalance = Math.max(0, newBalance - txData.amount);
    }

    // Update entity balance
    contacts[entityIndex].currentBalance = newBalance;
    DB.saveContacts(contacts);

    const newTx: LedgerTransaction = {
      id: 'tx_' + Date.now(),
      entityId: txData.entityId,
      type: txData.type,
      amount: txData.amount,
      balanceAfter: newBalance,
      description: txData.description,
      date: new Date().toISOString()
    };

    transactions.push(newTx);
    DB.saveTransactions(transactions);

    return newTx;
  }
}
