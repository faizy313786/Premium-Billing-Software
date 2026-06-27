import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  IndianRupee, 
  MinusCircle,
  FileText
} from 'lucide-react';
import { CustomerSupplier, LedgerTransaction } from '../services/db';
import { LedgerService } from '../services/ledgerService';

export const Ledger: React.FC = () => {
  const [contacts, setContacts] = useState<CustomerSupplier[]>([]);
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<CustomerSupplier | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  
  // Add Contact Modal State
  const [showAddContact, setShowAddContact] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  // Record Payment Modal State
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<'debit' | 'credit'>('credit'); // credit = reduces balance
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDescription, setPaymentDescription] = useState('');

  // Load Contacts
  const loadContacts = () => {
    const list = activeTab === 'customer' 
      ? LedgerService.getCustomers() 
      : LedgerService.getSuppliers();
    setContacts(list);
  };

  useEffect(() => {
    loadContacts();
    setSelectedContact(null);
    setTransactions([]);
  }, [activeTab]);

  // Load transactions when contact is selected
  useEffect(() => {
    if (selectedContact) {
      const list = LedgerService.getTransactionsForEntity(selectedContact.id);
      setTransactions(list);
    } else {
      setTransactions([]);
    }
  }, [selectedContact]);

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    );
  }, [contacts, searchQuery]);

  // Compute stats
  const totalDues = useMemo(() => {
    return contacts.reduce((sum, c) => sum + c.currentBalance, 0);
  }, [contacts]);

  // Handle Save Contact
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const saved = LedgerService.saveContact({
      type: activeTab,
      name,
      phone,
      email,
      currentBalance: openingBalance
    });

    if (openingBalance > 0) {
      // Record initial transaction
      LedgerService.addTransaction({
        entityId: saved.id,
        type: 'debit',
        amount: openingBalance,
        description: 'Opening Balance'
      });
    }

    loadContacts();
    setShowAddContact(false);
    setName('');
    setPhone('');
    setEmail('');
    setOpeningBalance(0);
  };

  // Handle Record Transaction
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || paymentAmount <= 0) return;

    LedgerService.addTransaction({
      entityId: selectedContact.id,
      type: paymentType,
      amount: paymentAmount,
      description: paymentDescription || (paymentType === 'credit' ? 'Payment Received' : 'New Dues Recorded')
    });

    // Refresh selected contact state and transactions list
    const updatedContacts = LedgerService.getContacts();
    const updatedContact = updatedContacts.find(c => c.id === selectedContact.id) || null;
    setSelectedContact(updatedContact);
    loadContacts();

    // Close Modal
    setShowRecordPayment(false);
    setPaymentAmount(0);
    setPaymentDescription('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Accounts & Ledger (Khata)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track credit history, dues, and payments for customers and suppliers.
          </p>
        </div>
        <button
          onClick={() => setShowAddContact(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 dark:shadow-indigo-600/5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New {activeTab === 'customer' ? 'Customer' : 'Supplier'}</span>
        </button>
      </div>

      {/* Tabs Selector & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        
        {/* Tab switch buttons */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 flex gap-2 items-center">
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold capitalize transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'customer' ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold capitalize transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'supplier' ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
          >
            <Users className="w-4 h-4" />
            <span>Supplier Ledger</span>
          </button>
        </div>

        {/* Dynamic Outstanding dues stat card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Total Outstanding {activeTab === 'customer' ? 'Receivables' : 'Payables'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white font-sans">
              ₹{totalDues.toLocaleString('en-IN')}
            </h3>
          </div>
          <div className={`p-3 rounded-xl ${activeTab === 'customer' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Ledger Split Pane (Profiles on Left, Transactions on Right) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Profiles List */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
            {filteredContacts.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedContact(c)}
                className={`p-4 cursor-pointer transition-colors text-left flex justify-between items-center ${selectedContact?.id === c.id ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600' : 'hover:bg-slate-50/50 dark:hover:bg-slate-950/20'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-semibold text-sm truncate leading-tight">{c.name}</h4>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">{c.phone || 'No phone'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold block font-sans ${c.currentBalance > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400'}`}>
                    ₹{c.currentBalance}
                  </span>
                </div>
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                No ledger profiles found.
              </div>
            )}
          </div>
        </div>

        {/* Right Ledger Transactions Log */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 min-h-[480px] flex flex-col">
          {selectedContact ? (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                    {selectedContact.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedContact.name}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Ph: {selectedContact.phone} | Email: {selectedContact.email || 'None'}</p>
                  </div>
                </div>
                
                {/* Balance display and transaction buttons */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Balance Dues</span>
                    <h4 className="text-xl font-extrabold text-amber-600 dark:text-amber-500 font-sans">₹{selectedContact.currentBalance}</h4>
                  </div>
                  <button
                    onClick={() => {
                      setPaymentType('credit'); // default to credit payment
                      setShowRecordPayment(true);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="flex-1 my-4 space-y-3 overflow-y-auto max-h-[300px] pr-2">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold">{tx.description}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                        {new Date(tx.date).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold block font-sans ${tx.type === 'debit' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {tx.type === 'debit' ? '+' : '-'} ₹{tx.amount}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Bal: ₹{tx.balanceAfter}</span>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center py-16 text-slate-400 text-sm">
                    No transactions found for this profile.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-20">
              <FileText className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
              <h4 className="font-bold text-slate-500">No Profile Selected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Select a profile from the left sidebar to view ledger transaction statements and record new accounts entries.</p>
            </div>
          )}
        </div>
      </div>

      {/* ADD CONTACT MODAL */}
      {showAddContact && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold">Add {activeTab === 'customer' ? 'Customer' : 'Supplier'} Profile</h3>
            
            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Opening Balance / Dues (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-sm cursor-pointer shadow-md"
                >
                  Save Profile
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 font-bold py-2 rounded-xl text-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD TRANSACTION MODAL */}
      {showRecordPayment && selectedContact && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold">Record Transaction</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal">
              Modify account balance for <strong>{selectedContact.name}</strong>. Active outstanding: ₹{selectedContact.currentBalance}.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentType('credit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${paymentType === 'credit' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500'}`}
                  >
                    Payment Received
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('debit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${paymentType === 'debit' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500'}`}
                  >
                    Record New Dues
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in Cash / UPI transaction ref"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer shadow-md"
                >
                  Save Entry
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecordPayment(false)}
                  className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 font-bold py-2.5 rounded-xl text-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
