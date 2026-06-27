import { DB, CustomerSupplier, LedgerTransaction } from './db';

const CONTACTS_API = 'http://localhost:8080/api/contacts';
const LEDGER_API = 'http://localhost:8080/api/ledger';

export class LedgerService {
  static async getContacts(): Promise<CustomerSupplier[]> {
    try {
      const response = await fetch(CONTACTS_API);
      if (response.ok) {
        return await response.json() as CustomerSupplier[];
      }
    } catch (e) {
      console.warn('Backend Contacts API offline, falling back to LocalStorage:', e);
    }
    return DB.getContacts();
  }

  static async getCustomers(): Promise<CustomerSupplier[]> {
    const list = await this.getContacts();
    return list.filter(c => c.type === 'customer');
  }

  static async getSuppliers(): Promise<CustomerSupplier[]> {
    const list = await this.getContacts();
    return list.filter(c => c.type === 'supplier');
  }

  static async saveContact(contact: Omit<CustomerSupplier, 'id' | 'currentBalance'> & { id?: string; currentBalance?: number }): Promise<CustomerSupplier> {
    try {
      const response = await fetch(CONTACTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact.id || '',
          type: contact.type,
          name: contact.name,
          phone: contact.phone || null,
          email: contact.email || null,
          currentBalance: contact.currentBalance || 0
        })
      });
      if (response.ok) {
        return await response.json() as CustomerSupplier;
      }
    } catch (e) {
      console.warn('Backend Contacts API offline, falling back to LocalStorage:', e);
    }

    // Offline Fallback
    const contacts = DB.getContacts();
    if (contact.id) {
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

  static async deleteContact(id: string): Promise<void> {
    try {
      const response = await fetch(`${CONTACTS_API}/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) return;
    } catch (e) {
      console.warn('Backend Contacts API offline, falling back to LocalStorage:', e);
    }

    // Offline Fallback
    const contacts = DB.getContacts();
    const updated = contacts.filter(c => c.id !== id);
    DB.saveContacts(updated);
    
    const txs = DB.getTransactions();
    const updatedTxs = txs.filter(t => t.entityId !== id);
    DB.saveTransactions(updatedTxs);
  }

  static async getTransactionsForEntity(entityId: string): Promise<LedgerTransaction[]> {
    try {
      const response = await fetch(`${LEDGER_API}/transactions?entityId=${entityId}`);
      if (response.ok) {
        return await response.json() as LedgerTransaction[];
      }
    } catch (e) {
      console.warn('Backend Ledger API offline, falling back to LocalStorage:', e);
    }
    
    // Offline Fallback
    const transactions = DB.getTransactions();
    return transactions
      .filter(t => t.entityId === entityId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  static async addTransaction(txData: {
    entityId: string;
    type: 'debit' | 'credit';
    amount: number;
    description: string;
  }): Promise<LedgerTransaction> {
    try {
      const response = await fetch(`${LEDGER_API}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '',
          entityId: txData.entityId,
          type: txData.type,
          amount: txData.amount,
          balanceAfter: 0,
          description: txData.description,
          date: new Date().toISOString()
        })
      });
      if (response.ok) {
        return await response.json() as LedgerTransaction;
      }
    } catch (e) {
      console.warn('Backend Ledger API offline, falling back to LocalStorage:', e);
    }

    // Offline Fallback
    const contacts = DB.getContacts();
    const transactions = DB.getTransactions();

    const entityIndex = contacts.findIndex(c => c.id === txData.entityId);
    if (entityIndex === -1) {
      throw new Error('Contact not found');
    }

    const entity = contacts[entityIndex];
    let newBalance = entity.currentBalance;

    if (txData.type === 'debit') {
      newBalance += txData.amount;
    } else {
      newBalance = Math.max(0, newBalance - txData.amount);
    }

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
