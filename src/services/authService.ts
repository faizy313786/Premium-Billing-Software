import { DB, User } from './db';

const SESSION_KEY = 'billing_current_user';
const API_URL = 'http://localhost:8080/api/auth';

export class AuthService {
  static async login(username: string): Promise<User | null> {
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      
      if (response.ok) {
        const user = await response.json() as User;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
    } catch (e) {
      console.warn('Backend Auth API offline, falling back to LocalStorage:', e);
    }
    
    // Offline Fallback
    const users = DB.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  }

  static getCurrentUser(): User | null {
    const userJson = localStorage.getItem(SESSION_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  }

  static logout(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  static async getAllUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_URL}/users`);
      if (response.ok) {
        return await response.json() as User[];
      }
    } catch (e) {
      console.warn('Backend Auth API offline, falling back to LocalStorage:', e);
    }
    return DB.getUsers();
  }

  static async createUser(user: Omit<User, 'id'>): Promise<User> {
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, id: '' })
      });
      if (response.ok) {
        return await response.json() as User;
      }
    } catch (e) {
      console.warn('Backend Auth API offline, falling back to LocalStorage:', e);
    }
    
    // Offline Fallback
    const users = DB.getUsers();
    const newId = (users.length + 1).toString();
    const newUser: User = { ...user, id: newId };
    users.push(newUser);
    DB.saveUsers(users);
    return newUser;
  }

  static async deleteUser(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) return;
    } catch (e) {
      console.warn('Backend Auth API offline, falling back to LocalStorage:', e);
    }
    
    // Offline Fallback
    const users = DB.getUsers();
    const updated = users.filter(u => u.id !== id);
    DB.saveUsers(updated);
  }

  static hasRole(roles: ('super_admin' | 'admin' | 'staff')[]): boolean {
    const current = this.getCurrentUser();
    if (!current) return false;
    return roles.includes(current.role);
  }
}
