import { DB, Product } from './db';

export class ProductService {
  static getProducts(): Product[] {
    return DB.getProducts();
  }

  static saveProduct(product: Omit<Product, 'id'> & { id?: string }): Product {
    const products = DB.getProducts();
    if (product.id) {
      // Update
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products[index] = { ...products[index], ...product } as Product;
      } else {
        throw new Error('Product not found');
      }
      DB.saveProducts(products);
      return products[index];
    } else {
      // Create
      const newId = 'p_' + Date.now();
      const newProduct: Product = { ...product, id: newId } as Product;
      products.push(newProduct);
      DB.saveProducts(products);
      return newProduct;
    }
  }

  static deleteProduct(id: string): void {
    const products = DB.getProducts();
    const updated = products.filter(p => p.id !== id);
    DB.saveProducts(updated);
  }

  static findByBarcodeOrSku(query: string): Product | null {
    const products = DB.getProducts();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;
    return products.find(p => p.barcode === trimmed || p.sku.toLowerCase() === trimmed) || null;
  }

  static search(query: string): Product[] {
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
