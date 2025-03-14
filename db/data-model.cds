using { 
    managed, 
    cuid, 
    sap.common.CodeList 
} from '@sap/cds/common';



namespace warehouse;

// Type Definitions
type EmailAddress : String(100) @assert.format: 'email';
type PhoneNumber : String(20) @assert.pattern: '^[+]?[0-9]{7,15}$';
type AmountT : Decimal(10,2);
type CurrencyT : String(3);

// Enum as a CodeList for better handling in UI
@cds.persistence.exists
entity OrderStatusList : CodeList {
    key code : String(20);
    name     : localized String;
}

// Customers Entity
entity Customers : cuid, managed {
    @title: 'Customer Name'
    name         : String(100) @mandatory;
    
    @title: 'Email Address'
    email        : EmailAddress;
    
    @title: 'Phone Number'
    phone        : PhoneNumber;
    
    @title: 'Address'
    address      : String(255);
    
    // Backlink to SalesOrders
    salesOrders  : Association to many SalesOrders on salesOrders.customer = $self;
}

// Vendors Entity
entity Vendors : cuid, managed {
    @title: 'Vendor Name'
    name         : String(100) @mandatory;
    
    @title: 'Email Address'
    email        : EmailAddress;
    
    @title: 'Phone Number'
    phone        : PhoneNumber;
    
    @title: 'Address'
    address      : String(255);
    
    // Backlink to PurchaseOrders
    purchaseOrders : Association to many PurchaseOrders on purchaseOrders.vendor = $self;
}

// Products Entity
entity Products : cuid, managed {
    @title: 'Product Name'
    name         : String(100) @mandatory;
    
    @title: 'SKU'
    sku          : String(50) @mandatory @unique;
    
    @title: 'Description'
    description  : String(500);
    
    @title: 'Price'
    price        : AmountT;
    
    @title: 'Currency'
    currency     : CurrencyT;
    
    @title: 'Unit Price'
    unitPrice    : AmountT;
    
    // Backlinks
    inventory    : Association to many Inventory on inventory.product = $self;
    purchaseItems : Association to many PurchaseOrderItems on purchaseItems.product = $self;
    salesItems   : Association to many SalesOrderItems on salesItems.product = $self;
}

// Inventory Entity
entity Inventory : cuid, managed {
    @title: 'Product'
    product              : Association to one Products;
    
    @title: 'Quantity'
    quantity             : Integer @assert.range: [0, null];
    
    @title: 'Warehouse Location'
    warehouseLocation    : String(100);
}

// Purchase Orders Entity
entity PurchaseOrders : cuid, managed {
    @title: 'Vendor'
    vendor          : Association to one Vendors;
    
    @title: 'Status'
    status          : Association to OrderStatusList;
    
    @title: 'Need By Date'
    needByDate      : Date;
    
    @title: 'Delivery Date'
    deliveryDate    : Date;
    
    @title: 'Total Amount'
    totalAmount     : AmountT;
    
    @title: 'Currency'
    currency        : CurrencyT;
    
    // Composition for order items
    items           : Composition of many PurchaseOrderItems on items.purchaseOrder = $self;
}

// Purchase Order Items Entity
entity PurchaseOrderItems : cuid, managed {
    @title: 'Purchase Order'
    purchaseOrder   : Association to one PurchaseOrders;
    
    @title: 'Product'
    product         : Association to one Products;
    
    @title: 'Quantity'
    quantity        : Integer @assert.range: [1, null];
    
    @title: 'Unit Price'
    unitPrice       : AmountT;
    
    @title: 'Price'
    price           : AmountT;
    
    @title: 'Currency'
    currency        : CurrencyT;
}

// Sales Orders Entity
entity SalesOrders : cuid, managed {
    @title: 'Customer'
    customer        : Association to one Customers;
    
    @title: 'Status'
    status          : Association to OrderStatusList;
    
    @title: 'Need By Date'
    needByDate      : Date;
    
    @title: 'Delivery Date'
    deliveryDate    : Date;
    
    @title: 'Total Amount'
    totalAmount     : AmountT;
    
    @title: 'Currency'
    currency        : CurrencyT;
    
    // Composition for order items
    items           : Composition of many SalesOrderItems on items.salesOrder = $self;
}

// Sales Order Items Entity
entity SalesOrderItems : cuid, managed {
    @title: 'Sales Order'
    salesOrder      : Association to one SalesOrders;
    
    @title: 'Product'
    product         : Association to one Products;
    
    @title: 'Quantity'
    quantity        : Integer @assert.range: [1, null];
    
    @title: 'Unit Price'
    unitPrice       : AmountT;
    
    @title: 'Price'
    price           : AmountT;
    
    @title: 'Currency'
    currency        : CurrencyT;
}

entity test  {
    key id : UUID;
    name : String(32);
    quantity: Integer;
}

entity test2 : cuid {
    // key id : UUID;
    name : String(32);
    quantity: Integer;
}