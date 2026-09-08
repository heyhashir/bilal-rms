SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE receipts;
TRUNCATE TABLE pos_payments;
TRUNCATE TABLE pos_sale_items;
TRUNCATE TABLE pos_returns;
TRUNCATE TABLE pos_exchanges;
TRUNCATE TABLE pos_sales;

TRUNCATE TABLE order_items;
TRUNCATE TABLE payment_proofs;
TRUNCATE TABLE return_requests;
TRUNCATE TABLE refund_records;
TRUNCATE TABLE orders;
TRUNCATE TABLE addresses;

TRUNCATE TABLE inventory_movements;
TRUNCATE TABLE commission_entries;
TRUNCATE TABLE ledger_entries;
TRUNCATE TABLE vendor_purchases;
TRUNCATE TABLE sync_jobs;

TRUNCATE TABLE product_images;
TRUNCATE TABLE product_variants;
TRUNCATE TABLE products;

TRUNCATE TABLE document_sequences;

SET FOREIGN_KEY_CHECKS = 1;
