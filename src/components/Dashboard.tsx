import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Receipt, 
  AlertTriangle, 
  IndianRupee, 
  ShoppingBag,
  ArrowRight,
  Users
} from 'lucide-react';
import { Product, Invoice, CustomerSupplier } from '../services/db';
import { ProductService } from '../services/productService';
import { BillingService } from '../services/billingService';
import { LedgerService } from '../services/ledgerService';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<CustomerSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Load metrics asynchronously
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const prodList = await ProductService.getProducts();
        const invList = await BillingService.getInvoices();
        const contactList = await LedgerService.getContacts();
        setProducts(prodList);
        setInvoices(invList);
        setContacts(contactList);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  // Compute Metrics
  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [invoices]);

  const totalInvoices = invoices.length;

  const totalPendingDues = useMemo(() => {
    return contacts
      .filter(c => c.type === 'customer')
      .reduce((sum, c) => sum + c.currentBalance, 0);
  }, [contacts]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.stock < 10).length;
  }, [products]);

  // Daily Sales Calculation (for last 7 days)
  const dailySalesData = useMemo(() => {
    const data: { day: string; amount: number }[] = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const amount = invoices
        .filter(inv => new Date(inv.date).toDateString() === dateStr)
        .reduce((sum, inv) => sum + inv.grandTotal, 0);

      data.push({
        day: daysOfWeek[d.getDay()],
        amount
      });
    }
    return data;
  }, [invoices]);

  // Monthly Profit/Loss Calculation
  const monthlyData = [
    { month: 'Jan', profit: 45000, loss: 12000 },
    { month: 'Feb', profit: 54000, loss: 15000 },
    { month: 'Mar', profit: 62000, loss: 8000 },
    { month: 'Apr', profit: 48000, loss: 11000 },
    { month: 'May', profit: 71000, loss: 14000 },
    { month: 'Jun', profit: 89000, loss: 16000 },
  ];

  // Top Selling Items (Aggregate qty sold per product)
  const topSelling = useMemo(() => {
    const salesMap: Record<string, { name: string; qty: number; total: number }> = {};
    for (const inv of invoices) {
      for (const item of inv.items) {
        if (!salesMap[item.productId]) {
          salesMap[item.productId] = { name: item.name, qty: 0, total: 0 };
        }
        salesMap[item.productId].qty += item.qty;
        salesMap[item.productId].total += item.total;
      }
    }
    return Object.values(salesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);
  }, [invoices]);

  // Low stock products
  const lowStockItems = useMemo(() => {
    return products.filter(p => p.stock < 10).slice(0, 4);
  }, [products]);

  // Render SVG Chart for Daily Sales
  const renderDailyChart = () => {
    const width = 500;
    const height = 180;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = Math.max(...dailySalesData.map(d => d.amount), 1000);
    const points = dailySalesData.map((d, i) => {
      const x = padding + (i * chartWidth) / (dailySalesData.length - 1);
      const y = padding + chartHeight - (d.amount / maxVal) * chartHeight;
      return { x, y };
    });

    const pathData = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaData = points.length > 0 
      ? `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
          </linearGradient>
        </defs>
        
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding + chartHeight * ratio;
          return (
            <line 
              key={index}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              className="stroke-slate-200/60 dark:stroke-slate-800/40"
              strokeDasharray="4 4"
            />
          );
        })}

        {points.length > 0 && (
          <>
            <path d={areaData} fill="url(#areaGrad)" />
            <path d={pathData} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_2px_4px_rgba(79,70,229,0.3)]" />
          </>
        )}

        {points.map((p, i) => (
          <g key={i} className="group/dot cursor-pointer">
            <circle cx={p.x} cy={p.y} r="5" className="fill-white stroke-indigo-600 dark:stroke-indigo-400 stroke-[3]" />
            <circle cx={p.x} cy={p.y} r="8" className="fill-indigo-600 opacity-0 group-hover/dot:opacity-20 transition-opacity" />
          </g>
        ))}

        {dailySalesData.map((d, i) => {
          const x = padding + (i * chartWidth) / (dailySalesData.length - 1);
          return (
            <text 
              key={i} 
              x={x} 
              y={height - 8} 
              textAnchor="middle" 
              className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500 font-sans"
            >
              {d.day}
            </text>
          );
        })}
      </svg>
    );
  };

  const renderPLChart = () => {
    const width = 500;
    const height = 180;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = 14;

    const maxVal = Math.max(...monthlyData.map(d => Math.max(d.profit, d.loss)), 1000);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding + chartHeight * ratio;
          return (
            <line 
              key={index}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              className="stroke-slate-200/60 dark:stroke-slate-800/40"
              strokeDasharray="4 4"
            />
          );
        })}

        {monthlyData.map((d, i) => {
          const x = padding + (i * chartWidth) / (monthlyData.length - 1) + 5;
          const profitHeight = (d.profit / maxVal) * chartHeight;
          const lossHeight = (d.loss / maxVal) * chartHeight;

          const profitY = padding + chartHeight - profitHeight;
          const lossY = padding + chartHeight - lossHeight;

          return (
            <g key={i}>
              <rect 
                x={x - barWidth - 2} 
                y={profitY} 
                width={barWidth} 
                height={profitHeight} 
                rx="3"
                className="fill-emerald-500 hover:fill-emerald-600 transition-colors duration-150" 
              />
              <rect 
                x={x + 2} 
                y={lossY} 
                width={barWidth} 
                height={lossHeight} 
                rx="3"
                className="fill-rose-500 hover:fill-rose-600 transition-colors duration-150" 
              />
            </g>
          );
        })}

        {monthlyData.map((d, i) => {
          const x = padding + (i * chartWidth) / (monthlyData.length - 1) + 5;
          return (
            <text 
              key={i} 
              x={x} 
              y={height - 8} 
              textAnchor="middle" 
              className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500 font-sans"
            >
              {d.month}
            </text>
          );
        })}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-650" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time analytics and overview of your business metrics.
          </p>
        </div>
        <button 
          onClick={() => onNavigate('billing')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 dark:shadow-indigo-600/5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-sm"
        >
          <Receipt className="w-4 h-4" />
          <span>New Billing (POS)</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Total Revenue</p>
              <h3 className="text-2xl font-bold mt-2 font-sans tracking-tight">₹{totalRevenue.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-emerald-500">
            <TrendingUp className="w-4 h-4" />
            <span>+12.4% since last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Total Invoices</p>
              <h3 className="text-2xl font-bold mt-2 font-sans tracking-tight">{totalInvoices}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-indigo-500">
            <TrendingUp className="w-4 h-4" />
            <span>+8.2% since last week</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Pending Dues</p>
              <h3 className="text-2xl font-bold mt-2 font-sans tracking-tight text-amber-600 dark:text-amber-500">₹{totalPendingDues.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Requires customer follow-ups</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Low Stock Alert</p>
              <h3 className={`text-2xl font-bold mt-2 font-sans tracking-tight ${lowStockCount > 0 ? 'text-rose-600 dark:text-rose-500' : ''}`}>
                {lowStockCount}
              </h3>
            </div>
            <div className={`p-3 rounded-xl group-hover:scale-105 transition-transform duration-200 ${lowStockCount > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            {lowStockCount > 0 ? (
              <span className="text-rose-500">Need stock replenishment</span>
            ) : (
              <span>All inventory is fully stocked</span>
            )}
          </div>
        </div>
      </div>

      {/* Analytics SVG Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-bold text-base">Weekly Sales Trend</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Total invoice amount per day</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Growing</span>
            </div>
          </div>
          <div className="h-44 w-full flex items-center justify-center">
            {renderDailyChart()}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-bold text-base">Profit vs Loss Analysis</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Historical monthly comparisons</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-400 font-medium">Profit</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-400 font-medium">Loss</span>
              </div>
            </div>
          </div>
          <div className="h-44 w-full flex items-center justify-center">
            {renderPLChart()}
          </div>
        </div>
      </div>

      {/* Bottom Inventory Warnings & Top Sellers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-500" />
              <span>Top Selling Items</span>
            </h4>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">This Month</span>
          </div>

          {topSelling.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topSelling.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{item.name}</p>
                      <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">Qty Sold: {item.qty} units</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-sans">₹{item.total.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              No sales recorded yet. Start billing to see analytics!
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Low Stock Alerts</span>
            </h4>
            <button 
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Manage stock</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {lowStockItems.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold leading-tight">{item.name}</p>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">SKU: {item.sku}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-500/20">
                      {item.stock} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              All items are fully stocked! Great job.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
