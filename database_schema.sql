-- ============================================================================
-- VyapaarPay Database Schema (SQL Script)
-- Compatible with PostgreSQL, MySQL, and SQLite
-- ============================================================================

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff')),
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    category VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexing barcode and sku for fast POS billing scans
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);

-- 3. Contacts Table (Customers & Suppliers)
CREATE TABLE contacts (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('customer', 'supplier')),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_phone ON contacts(phone);

-- 4. Invoices Table
CREATE TABLE invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) NOT NULL,
    grand_total DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) NOT NULL,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'card', 'upi', 'credit')),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL
);

CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_date ON invoices(date);

-- 5. Invoice Items Table (Many-to-One with Invoices)
CREATE TABLE invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY, -- Use SERIAL PRIMARY KEY for PostgreSQL
    invoice_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    qty INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_items_invoice_id ON invoice_items(invoice_id);

-- 6. Ledger Transactions Table
CREATE TABLE ledger_transactions (
    id VARCHAR(50) PRIMARY KEY,
    entity_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('debit', 'credit')),
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    description TEXT,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE INDEX idx_ledger_entity ON ledger_transactions(entity_id);
CREATE INDEX idx_ledger_date ON ledger_transactions(date);


-- ============================================================================
-- Initial Seeding Queries (Demo Data)
-- ============================================================================

-- Seed Users
INSERT INTO users (id, username, name, role, email) VALUES
('1', 'superadmin', 'Rahul Nair', 'super_admin', 'rahul@billingapp.com'),
('2', 'admin', 'Faisal K.V.', 'admin', 'faisal@billingapp.com'),
('3', 'staff', 'Jithin Das', 'staff', 'jithin@billingapp.com');

-- Seed Products
INSERT INTO products (id, name, sku, barcode, purchase_price, selling_price, stock, category) VALUES
('p1', 'Basmati Rice Premium 5kg', 'RICE-BAS-05', '8901234567890', 420.00, 550.00, 45, 'Groceries'),
('p2', 'Coconut Oil 1 Litre', 'COCO-OIL-01', '8901234567891', 180.00, 220.00, 8, 'Oils & Ghee'),
('p3', 'Tata Tea Premium 1kg', 'TEA-TATA-01', '8901234567892', 310.00, 380.00, 60, 'Beverages'),
('p4', 'Aashirvaad Shudh Chakki Atta 10kg', 'ATTA-AAS-10', '8901234567893', 390.00, 480.00, 5, 'Groceries'),
('p5', 'Dettol Liquid Handwash 750ml', 'DET-HW-750', '8901234567894', 110.00, 149.00, 24, 'Hygiene'),
('p6', 'Surf Excel Easy Wash 1kg', 'SURF-EX-01', '8901234567895', 130.00, 165.00, 15, 'Household');

-- Seed Contacts
INSERT INTO contacts (id, type, name, phone, email, current_balance) VALUES
('c1', 'customer', 'Anil Kumar', '9847012345', 'anil@gmail.com', 450.00),
('c2', 'customer', 'Sreedevi Haridas', '9847054321', 'sree@gmail.com', 0.00),
('s1', 'supplier', 'Malabar Distributors', '9447098765', 'info@malabardist.com', 12500.00),
('s2', 'supplier', 'Peevees Groceries Wholesale', '9447123456', 'contact@peevees.com', 0.00);

-- Seed Invoices
INSERT INTO invoices (id, invoice_number, customer_id, customer_name, subtotal, tax_amount, discount_amount, grand_total, paid_amount, balance, payment_mode, date, created_by) VALUES
('inv1', 'INV-1001', 'c1', 'Anil Kumar', 523.81, 26.19, 0.00, 550.00, 100.00, 450.00, 'credit', '2026-06-25 14:30:00', 'Faisal K.V.');

-- Seed Invoice Items (For MySQL, change SERIAL field rules or insert ID explicitly if needed)
INSERT INTO invoice_items (invoice_id, product_id, name, qty, price, gst_rate, gst_amount, discount, total) VALUES
('inv1', 'p1', 'Basmati Rice Premium 5kg', 1, 550.00, 5.00, 26.19, 0.00, 550.00);

-- Seed Ledger Transactions
INSERT INTO ledger_transactions (id, entity_id, type, amount, balance_after, description, date) VALUES
('t1', 'c1', 'debit', 450.00, 450.00, 'Credit purchase on Invoice #INV-1001', '2026-06-25 14:30:00'),
('t2', 's1', 'debit', 12500.00, 12500.00, 'Purchase of Groceries Stock Batch #99', '2026-06-24 10:15:00');
