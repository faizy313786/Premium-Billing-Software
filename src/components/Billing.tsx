import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Trash2, 
  Search, 
  UserPlus, 
  Keyboard, 
  Printer, 
  Save,
  CheckCircle,
  FileText,
  Receipt
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, Product, CustomerSupplier, InvoiceItem } from '../services/db';
import { ProductService } from '../services/productService';
import { BillingService } from '../services/billingService';
import { LedgerService } from '../services/ledgerService';

interface BillingProps {
  currentUser: User;
}

export const Billing: React.FC<BillingProps> = ({ currentUser }) => {
  // State
  const [customers, setCustomers] = useState<CustomerSupplier[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash');
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printedInvoice, setPrintedInvoice] = useState<any>(null);
  
  // Quick Add Customer modal state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  // Refs for keyboard focus
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerSelectRef = useRef<HTMLSelectElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Load customers
  useEffect(() => {
    setCustomers(LedgerService.getCustomers());
  }, [showAddCustomer]);

  // Autofocus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Keyboard Shortcuts Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 for New Invoice
      if (e.key === 'F2') {
        e.preventDefault();
        handleNewInvoice();
      }
      // F5 to Save & Print
      if (e.key === 'F5') {
        e.preventDefault();
        handleSaveAndSubmit();
      }
      // "+" to add a new row / focus search
      if (e.key === '+') {
        const activeEl = document.activeElement;
        const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'SELECT' || activeEl?.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [items, selectedCustomerId, paymentMode, discountType, discountValue, paidAmount]);

  // Product Search suggestions logic
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const results = ProductService.search(searchQuery);
      setSuggestions(results);
      setActiveSuggestionIndex(0);
    } else {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  }, [searchQuery]);

  // Live POS calculation
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // Tax computation (CGST & SGST split)
    const taxAmount = items.reduce((sum, item) => {
      const itemGst = (item.price * item.qty) * (item.gstRate / 100);
      return sum + itemGst;
    }, 0);

    // Discount computation
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = (subtotal + taxAmount) * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }

    const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);

    return {
      subtotal,
      taxAmount,
      discountAmount,
      grandTotal
    };
  }, [items, discountType, discountValue]);

  // Update paid amount automatically for non-credit modes
  useEffect(() => {
    if (paymentMode !== 'credit') {
      setPaidAmount(calculations.grandTotal);
    }
  }, [calculations.grandTotal, paymentMode]);

  // Quick Customer Creation
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const contact = LedgerService.saveContact({
      type: 'customer',
      name: newCustomerName,
      phone: newCustomerPhone,
      email: newCustomerEmail
    });

    setCustomers(prev => [...prev, contact]);
    setSelectedCustomerId(contact.id);
    setShowAddCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    searchInputRef.current?.focus();
  };

  // Add Item to Billing list
  const handleAddItem = (product: Product) => {
    if (product.stock === 0) {
      alert(`Warning: ${product.name} is out of stock!`);
    }

    const existingIndex = items.findIndex(item => item.productId === product.id);

    if (existingIndex !== -1) {
      const updated = [...items];
      updated[existingIndex].qty += 1;
      updated[existingIndex].total = updated[existingIndex].qty * updated[existingIndex].price;
      setItems(updated);
    } else {
      const newItem: InvoiceItem = {
        productId: product.id,
        name: product.name,
        qty: 1,
        price: product.sellingPrice,
        gstRate: 18, // Standard 18% GST (9% CGST + 9% SGST)
        gstAmount: product.sellingPrice * 0.18,
        discount: 0,
        total: product.sellingPrice
      };
      setItems(prev => [...prev, newItem]);
    }

    setSearchQuery('');
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
    searchInputRef.current?.focus();
  };

  // suggestions list keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // If suggestions are active, add the active item
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        handleAddItem(suggestions[activeSuggestionIndex]);
      } else {
        // Barcode reader fast resolution path: check if query is exact SKU or Barcode
        const matched = ProductService.findByBarcodeOrSku(searchQuery);
        if (matched) {
          handleAddItem(matched);
        }
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  };

  const handleQtyChange = (index: number, newQty: number) => {
    const updated = [...items];
    updated[index].qty = Math.max(1, newQty);
    updated[index].total = updated[index].qty * updated[index].price;
    setItems(updated);
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    const updated = [...items];
    updated[index].price = Math.max(0, newPrice);
    updated[index].total = updated[index].qty * updated[index].price;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewInvoice = () => {
    setItems([]);
    setSelectedCustomerId('walkin');
    setSearchQuery('');
    setDiscountValue(0);
    setPaymentMode('cash');
    setPaidAmount(0);
    searchInputRef.current?.focus();
  };

  const handleSaveAndSubmit = () => {
    if (items.length === 0) {
      alert('Please add at least one item to invoice!');
      return;
    }

    const customerName = selectedCustomerId === 'walkin' 
      ? 'Walk-in Customer' 
      : (customers.find(c => c.id === selectedCustomerId)?.name || 'Customer');

    const invoice = BillingService.createInvoice({
      customerId: selectedCustomerId,
      customerName,
      items,
      subtotal: calculations.subtotal,
      taxAmount: calculations.taxAmount,
      discountAmount: calculations.discountAmount,
      grandTotal: calculations.grandTotal,
      paidAmount: paidAmount,
      paymentMode,
      createdBy: currentUser.name
    });

    // Confetti effect
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    setPrintedInvoice(invoice);
    setShowPrintModal(true);
  };

  const triggerNativePrint = () => {
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const closePrintModal = () => {
    setShowPrintModal(false);
    setPrintedInvoice(null);
    handleNewInvoice();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
      
      {/* Printable Invoice Container (Hidden in screen view, visible in Print view) */}
      {printedInvoice && (
        <div id="print-area" className="p-4 font-mono text-sm max-w-sm mx-auto bg-white border border-slate-200">
          <div className="text-center font-bold text-lg mb-1">VYAPAARPAY BILLING</div>
          <div className="text-center text-xs mb-3">Kozhikode, Kerala | Ph: 9876543210</div>
          
          <hr className="border-dashed my-2 border-slate-300" />
          
          <div className="text-xs space-y-1">
            <div><strong>Invoice:</strong> {printedInvoice.invoiceNumber}</div>
            <div><strong>Date:</strong> {new Date(printedInvoice.date).toLocaleString()}</div>
            <div><strong>Billed By:</strong> {printedInvoice.createdBy}</div>
            <div><strong>Customer:</strong> {printedInvoice.customerName}</div>
          </div>
          
          <hr className="border-dashed my-2 border-slate-300" />
          
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-dashed border-slate-300">
                <th className="py-1">Item</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {printedInvoice.items.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-1 font-semibold">{item.name}</td>
                  <td className="py-1 text-center">{item.qty}</td>
                  <td className="py-1 text-right">₹{item.price}</td>
                  <td className="py-1 text-right">₹{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="border-dashed my-2 border-slate-300" />

          <div className="text-xs space-y-1 text-right">
            <div>Subtotal: ₹{printedInvoice.subtotal.toFixed(2)}</div>
            <div>Tax (GST): ₹{printedInvoice.taxAmount.toFixed(2)}</div>
            {printedInvoice.discountAmount > 0 && (
              <div className="text-rose-600">Discount: -₹{printedInvoice.discountAmount.toFixed(2)}</div>
            )}
            <div className="font-bold text-sm">Grand Total: ₹{printedInvoice.grandTotal.toFixed(2)}</div>
            <div className="border-t border-slate-200 pt-1">Paid Amount: ₹{printedInvoice.paidAmount.toFixed(2)}</div>
            {printedInvoice.balance > 0 && (
              <div className="text-rose-600 font-bold">Balance Dues: ₹{printedInvoice.balance.toFixed(2)}</div>
            )}
          </div>

          <hr className="border-dashed my-3 border-slate-300" />
          <div className="text-center text-xs font-bold">THANK YOU | VISIT AGAIN</div>
          <div className="text-center text-[9px] mt-1 text-slate-400">Powered by VyapaarPay</div>
        </div>
      )}

      {/* POS Left Column (Billing Table and Search) */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Customer Select & Quick Add */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Select Customer</label>
            <select
              ref={customerSelectRef}
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
            >
              <option value="walkin">Walk-in Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setShowAddCustomer(true)}
            className="w-full sm:w-auto mt-5 sm:mt-0 flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Product Search Box */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Product Name, Category or Scan Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-4 right-4 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {suggestions.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => handleAddItem(p)}
                  className={`px-4 py-3 flex justify-between items-center cursor-pointer transition-colors ${idx === activeSuggestionIndex ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-950/50'}`}
                >
                  <div>
                    <h5 className="text-sm font-semibold">{p.name}</h5>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Barcode: {p.barcode} | SKU: {p.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold block">₹{p.sellingPrice}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.stock < 10 ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600' : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600'}`}>
                      {p.stock} units left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoice Items Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden">
          <div ref={tableContainerRef} className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider">
                  <th className="px-5 py-4">Item Details</th>
                  <th className="px-5 py-4 w-24 text-center">Qty</th>
                  <th className="px-5 py-4 w-32 text-right">Price (₹)</th>
                  <th className="px-5 py-4 w-20 text-center">GST</th>
                  <th className="px-5 py-4 w-32 text-right">Total (₹)</th>
                  <th className="px-5 py-4 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, idx) => (
                  <tr key={item.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <span className="text-xs text-slate-400 dark:text-slate-500">GST included</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                        className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-right font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-5 py-4 text-center text-xs font-semibold text-slate-500">
                      {item.gstRate}%
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-sm font-sans">
                      ₹{item.total.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button 
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-slate-400 dark:text-slate-500 text-sm">
                      <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-800 mb-3" />
                      No items added yet. Search or scan barcode to add products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Keyboard Shortcuts helper */}
        <div className="bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40 rounded-xl p-3 flex flex-wrap gap-4 items-center justify-between text-xs text-slate-500">
          <span className="font-semibold flex items-center gap-1.5">
            <Keyboard className="w-4 h-4" /> Shortcuts Helper:
          </span>
          <div className="flex gap-4">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50 font-bold mr-1">F2</kbd> New Bill</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50 font-bold mr-1">F5</kbd> Save & Print</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50 font-bold mr-1">+</kbd> Focus Search</span>
          </div>
        </div>
      </div>

      {/* POS Right Column (Calculations, Payment and Submit) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 space-y-6">
        <h4 className="font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3">Payment Summary</h4>
        
        {/* Totals panel */}
        <div className="space-y-3.5 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Items Subtotal</span>
            <span className="font-semibold font-sans">₹{calculations.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>GST Tax (9% CGST + 9% SGST)</span>
            <span className="font-semibold font-sans">₹{calculations.taxAmount.toFixed(2)}</span>
          </div>

          {/* Discount custom inputs */}
          <div className="space-y-2 border-y border-slate-100 dark:border-slate-800 py-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Discount</span>
              <div className="flex gap-1 bg-slate-50 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                <button
                  onClick={() => setDiscountType('flat')}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${discountType === 'flat' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ₹
                </button>
                <button
                  onClick={() => setDiscountType('percentage')}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${discountType === 'percentage' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  %
                </button>
              </div>
            </div>
            <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
              <input
                type="number"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-bold text-sm outline-none text-right"
              />
              <span className="ml-1 text-slate-400 text-xs">{discountType === 'percentage' ? '%' : '₹'}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-slate-900 dark:text-white pt-2">
            <span className="font-bold text-base">Grand Total</span>
            <span className="font-black text-xl text-indigo-600 dark:text-indigo-400 font-sans">₹{calculations.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment mode select */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Payment Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(['cash', 'card', 'upi', 'credit'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode)}
                className={`
                  py-2.5 px-3 rounded-xl border text-sm font-semibold capitalize transition-all cursor-pointer
                  ${paymentMode === mode 
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950'}
                `}
              >
                {mode === 'upi' ? 'UPI' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Paid amount & Change calculator */}
        {paymentMode !== 'credit' && (
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Cash Received (₹)</label>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {paidAmount > calculations.grandTotal && (
              <div className="flex justify-between items-center text-xs text-emerald-500 font-bold bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <span>Change to Return:</span>
                <span className="text-sm font-black font-sans">₹{(paidAmount - calculations.grandTotal).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* If Credit mode is active */}
        {paymentMode === 'credit' && (
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Partial Payment (₹)</label>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="flex justify-between items-center text-xs text-rose-500 font-bold bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
              <span>Debit Amount to Khata:</span>
              <span className="text-sm font-black font-sans">₹{Math.max(0, calculations.grandTotal - paidAmount).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-2 pt-2">
          <button
            onClick={handleSaveAndSubmit}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-indigo-600/15 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>Save & Print Invoice (F5)</span>
          </button>
          
          <button
            onClick={handleNewInvoice}
            className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-slate-600 dark:text-slate-400"
          >
            <span>Reset / Clear (F2)</span>
          </button>
        </div>
      </div>

      {/* SUCCESS & PRINT PREVIEW MODAL */}
      {showPrintModal && printedInvoice && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
              <h3 className="text-xl font-bold">Invoice Saved Successfully!</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Invoice Number: {printedInvoice.invoiceNumber}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Customer</span>
                <span className="font-semibold">{printedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Payment Mode</span>
                <span className="font-semibold uppercase">{printedInvoice.paymentMode}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Total Billed</span>
                <span className="font-bold text-sm">₹{printedInvoice.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={triggerNativePrint}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              
              <button
                onClick={closePrintModal}
                className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 font-bold py-3 px-4 rounded-xl cursor-pointer text-slate-600 dark:text-slate-400"
              >
                <FileText className="w-4 h-4" />
                <span>New Bill (POS)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Quick Add Customer</h3>
            
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone Number</label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-sm cursor-pointer shadow-md"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 font-bold py-2 rounded-xl text-sm cursor-pointer"
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
