import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Trash2
} from 'lucide-react';
import { User } from '../services/db';
import { AuthService } from '../services/authService';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'super_admin' | 'admin' | 'staff'>('staff');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await AuthService.getAllUsers();
      setUsers(list);
    } catch (e) {
      console.error("Error loading users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;

    await AuthService.createUser({
      name,
      username,
      email,
      role
    });

    await loadUsers();
    setShowAddModal(false);
    setName('');
    setUsername('');
    setEmail('');
    setRole('staff');
  };

  const handleDeleteUser = async (id: string) => {
    const current = AuthService.getCurrentUser();
    if (current && current.id === id) {
      alert("You cannot delete your own account while logged in!");
      return;
    }

    if (window.confirm("Are you sure you want to delete this user profile? They will immediately lose access.")) {
      await AuthService.deleteUser(id);
      await loadUsers();
    }
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin Manager';
      default: return 'Billing Staff';
    }
  };

  const getRoleColor = (r: string) => {
    switch (r) {
      case 'super_admin': return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      case 'admin': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      default: return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Staff & User Controls
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Super Admin settings to provision employee logins and designate roles.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 dark:shadow-indigo-600/5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision User</span>
        </button>
      </div>

      {/* Users grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-650 mx-auto" />
          </div>
        ) : (
          users.map((u) => (
            <div 
              key={u.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 flex flex-col justify-between hover:shadow-xl hover:shadow-slate-100/50 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base border border-indigo-500/20">
                      {u.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">{u.name}</h3>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">@{u.username}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/50 pt-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Security Clearance</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getRoleColor(u.role)}`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Email Address</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{u.email || 'None'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PROVISION USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              <span>Provision User Profile</span>
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Faisal K.V."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Username / Login ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. faisal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. faisal@shop.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Access Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="staff">Billing Staff (POS only)</option>
                  <option value="admin">Admin (Inventory & Billing)</option>
                  <option value="super_admin">Super Admin (All Clearance)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer shadow-md"
                >
                  Create login
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
