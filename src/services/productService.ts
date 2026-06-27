import { DB, Product } from './db';

const API_URL = 'http://localhost:8080/api/products';

export class ProductService {
  static async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        return await response.json() as Product[];
      }
    } catch (e) {
      console.warn('Backend Products API offline, falling back to LocalStorage:', e);
    }
    return DB.getProducts();
  }

  static async saveProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id || '',
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          stock: product.stock,
          category: product.category
        })
      });
      if (response.ok) {
        return await response.json() as Product;
      }
    } catch (e) {
      console.warn('Backend Products API offline, falling back to LocalStorage:', e);
    }

    // Offline Fallback
    const products = DB.getProducts();
    if (product.id) {
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products[index] = { ...products[index], ...product } as Product;
      } else {
        throw new Error('Product not found');
      }
      DB.saveProducts(products);
      return products[index];
    } else {
      const newId = 'p_' + Date.now();
      const newProduct: Product = { ...product, id: newId } as Product;
      products.push(newProduct);
      DB.saveProducts(products);
      return newProduct;
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) return;
    } catch (e) {
      console.warn('Backend Products API offline, falling back to LocalStorage:', e);
    }

    // Offline Fallback
    const products = DB.getProducts();
    const updated = products.filter(p => p.id !== id);
    DB.saveProducts(updated);
  }

  static async findByBarcodeOrSku(query: string): Promise<Product | null> {
    const products = await this.getProducts();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;
    return products.find(p => p.barcode === trimmed || p.sku.toLowerCase() === trimmed) || null;
  }

  static async search(query: string): Promise<Product[]> {
    try {
      const response = await fetch(`${API_URL}?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        return await response.json() as Product[];
      }
    } catch (e) {
      console.warn('Backend Products API offline, falling back to LocalStorage:', e);
    }

    // Offline Fallback
    const products = DB.getProducts();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(trimmed) || 
      p.sku.toLowerCase().includes(trimmed) || 
      p.barcode.includes(trimmed) ||
      p.category.toLowerCase().includes(trimmed)
    );
  }

  // Not strictly needed on client when server manages decrements, but kept for offline support
  static decrementStock(id: string, qty: number): void {
    const products = DB.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index].stock = Math.max(0, products[index].stock - qty);
      DB.saveProducts(products);
    }
  }

  static incrementStock(id: string, qty: number): void {
    const products = DB.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index].stock += qty;
      DB.saveProducts(products);
    }
  }
}
