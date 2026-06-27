import { useState, useEffect } from 'react';
import { Sparkles, Key, Info } from 'lucide-react';
import { User } from './services/db';
import { AuthService } from './services/authService';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Billing } from './components/Billing';
import { Inventory } from './components/Inventory';
import { Ledger } from './components/Ledger';
import { UserManagement } from './components/UserManagement';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check existing session
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      if (user.role === 'staff') {
        setActiveTab('billing');
      }
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!usernameInput.trim()) {
      setLoginError('Please enter a username');
      return;
    }

    const user = await AuthService.login(usernameInput);
    if (user) {
      setCurrentUser(user);
      if (user.role === 'staff') {
        setActiveTab('billing');
      } else {
        setActiveTab('dashboard');
      }
      setUsernameInput('');
    } else {
      setLoginError('Invalid username. Use "superadmin", "admin", or "staff".');
    }
  };

  const handleQuickLogin = async (uname: string) => {
    const user = await AuthService.login(uname);
    if (user) {
      setCurrentUser(user);
      if (user.role === 'staff') {
        setActiveTab('billing');
      } else {
        setActiveTab('dashboard');
      }
      setLoginError('');
      setUsernameInput('');
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Safe authorization tab picker
  const renderTabContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
      case 'billing':
        return <Billing currentUser={currentUser} />;
      case 'inventory':
        if (currentUser.role === 'staff') return <Billing currentUser={currentUser} />;
        return <Inventory />;
      case 'ledger':
        if (currentUser.role === 'staff') return <Billing currentUser={currentUser} />;
        return <Ledger />;
      case 'users':
        if (currentUser.role !== 'super_admin') return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
        return <UserManagement />;
      default:
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative Background Glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-950/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 space-y-8 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 mb-2">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent font-sans">
              VyapaarPay Suite
            </h2>
            <p className="text-sm text-slate-400">POS, Inventory & accounts cloud console.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Login ID / Username</label>
              <div className="relative mt-2">
                <Key className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Enter login username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-semibold"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-rose-500 font-bold bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/15 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Access Account
            </button>
          </form>

          {/* Mock Quick Logins (Helpful for Testing) */}
          <div className="border-t border-slate-800/80 pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Quick Demo Login</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogin('superadmin')}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-650 border border-slate-800/80 text-xs font-bold transition-all text-rose-400 hover:text-white"
              >
                Super Admin
              </button>
              <button
                onClick={() => handleQuickLogin('admin')}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-650 border border-slate-800/80 text-xs font-bold transition-all text-amber-400 hover:text-white"
              >
                Admin
              </button>
              <button
                onClick={() => handleQuickLogin('staff')}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-650 border border-slate-800/80 text-xs font-bold transition-all text-indigo-400 hover:text-white"
              >
                Staff (POS)
              </button>
            </div>
            
            <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/40 text-[11px] text-slate-400 leading-relaxed flex gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong>ടെസ്റ്റിംഗ് ആവശ്യത്തിനായി:</strong> വ്യത്യസ്ത റോളുകൾ ടെസ്റ്റ് ചെയ്യാൻ മുകളിലുള്ള ബട്ടണുകൾ ഉപയോഗിക്കുക. <strong>Super Admin-ന്</strong> എല്ലാ ഫീച്ചറുകളും കാണാം, <strong>Staff-ന്</strong> ബില്ലിംഗ് മാത്രമേ കാണാൻ സാധിക്കൂ.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {renderTabContent()}
    </Layout>
  );
}

export default App;
