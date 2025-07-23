-- Insert sample order data for testing
-- First, let's get a sample customer ID (we'll use the first customer if exists)
INSERT INTO scooter_orders (
  customer_id, 
  order_number, 
  product_name, 
  status, 
  total_amount, 
  order_date, 
  shipping_address, 
  tracking_number
) 
SELECT 
  customers.id,
  'ORD-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
  orders.product_name,
  orders.status,
  orders.total_amount,
  orders.order_date,
  orders.shipping_address,
  orders.tracking_number
FROM customers
CROSS JOIN (
  VALUES 
    ('MyScoot Pro X1', 'delivered'::order_status, 1299.99, '2024-01-15 10:30:00'::timestamp, '123 Main St, Apt 4B\nNew York, NY 10001\nUnited States', 'TRK123456789'),
    ('MyScoot Urban Lite', 'shipped'::order_status, 899.99, '2024-01-20 14:20:00'::timestamp, '456 Oak Avenue\nLos Angeles, CA 90210\nUnited States', 'TRK987654321'),
    ('MyScoot City Cruiser', 'processing'::order_status, 1099.99, '2024-01-22 09:15:00'::timestamp, '789 Pine Street\nSeattle, WA 98101\nUnited States', 'TRK456789123'),
    ('MyScoot Speed Demon', 'confirmed'::order_status, 1599.99, '2024-01-25 16:45:00'::timestamp, '321 Elm Drive\nMiami, FL 33101\nUnited States', NULL),
    ('MyScoot Eco Plus', 'pending'::order_status, 799.99, '2024-01-28 11:30:00'::timestamp, '654 Maple Lane\nChicago, IL 60601\nUnited States', NULL)
) AS orders(product_name, status, total_amount, order_date, shipping_address, tracking_number)
WHERE EXISTS (SELECT 1 FROM customers LIMIT 1)
LIMIT 5;