import { DB, User } from './db';

const SESSION_KEY = 'billing_current_user';

export class AuthService {
  static login(username: string): User | null {
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

  static getAllUsers(): User[] {
    return DB.getUsers();
  }

  static createUser(user: Omit<User, 'id'>): User {
    const users = DB.getUsers();
    const newId = (users.length + 1).toString();
    const newUser: User = { ...user, id: newId };
    users.push(newUser);
    DB.saveUsers(users);
    return newUser;
  }

  static deleteUser(id: string): void {
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
