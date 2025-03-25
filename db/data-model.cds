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
@cds.persistence.exists
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
@cds.persistence.exists
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
@cds.persistence.exists
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
@cds.persistence.exists
entity Inventory : cuid, managed {
    @title: 'Product'
    product              : Association to one Products;
    
    @title: 'Quantity'
    quantity             : Integer @assert.range: [0, null];
    
    @title: 'Warehouse Location'
    warehouseLocation    : String(100);
}

// Purchase Orders Entity
@cds.persistence.exists
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
@cds.persistence.exists
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
@cds.persistence.exists
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
@cds.persistence.exists
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

entity ProductPerformanceView as 
    select from Products as p {
        p.ID,
        p.name,
        p.sku,
        p.price,
        p.currency,
        
        // Current inventory levels
        (select sum(quantity) from Inventory where product.ID = p.ID) as currentStock,
        
        // Pending sales (items in pending sales orders)
        (select sum(soi.quantity) 
          from SalesOrderItems as soi
          join SalesOrders as so on so.ID = soi.salesOrder.ID
          where soi.product.ID = p.ID and so.status.code = 'Pending') as pendingSales,
        
        // Pending purchases (items in pending purchase orders)
        (select sum(poi.quantity) 
          from PurchaseOrderItems as poi
          join PurchaseOrders as po on po.ID = poi.purchaseOrder.ID
          where poi.product.ID = p.ID and po.status.code = 'Pending') as pendingPurchases,
        
        // Completed sales in last 30 days
        (select count(distinct so.ID) 
          from SalesOrderItems as soi
          join SalesOrders as so on so.ID = soi.salesOrder.ID
          where soi.product.ID = p.ID 
            and so.status.code = 'Received'
            and so.deliveryDate > ADD_DAYS(CURRENT_DATE, -30)) as recentSalesCount,
            
        // Total quantity sold in last 30 days
        (select sum(soi.quantity) 
          from SalesOrderItems as soi
          join SalesOrders as so on so.ID = soi.salesOrder.ID
          where soi.product.ID = p.ID 
            and so.status.code = 'Received'
            and so.deliveryDate > ADD_DAYS(CURRENT_DATE, -30)) as recentSalesQuantity,
            
        // Project future stock level (current + pending purchases - pending sales)
        (select sum(quantity) from Inventory where product.ID = p.ID) + 
        (select coalesce(sum(poi.quantity), 0) 
          from PurchaseOrderItems as poi
          join PurchaseOrders as po on po.ID = poi.purchaseOrder.ID
          where poi.product.ID = p.ID and po.status.code = 'Pending') -
        (select coalesce(sum(soi.quantity), 0) 
          from SalesOrderItems as soi
          join SalesOrders as so on so.ID = soi.salesOrder.ID
          where soi.product.ID = p.ID and so.status.code = 'Pending') as projectedStock
    };

    @cds.persistence.exists // hdb view entity definition
    Entity inventory_status_by_location {
        key LOCATION: String(100)  @title: 'LOCATION' ; 
        TOTAL_ITEMS: Integer64 not null  @title: 'TOTAL_ITEMS' ; 
        TOTAL_QUANTITY: Integer  @title: 'TOTAL_QUANTITY' ; 
        LOW_STOCK_ITEMS: Integer not null  @title: 'LOW_STOCK_ITEMS' ; 
        OUT_OF_STOCK_ITEMS: Integer not null  @title: 'OUT_OF_STOCK_ITEMS' ; 
        AVG_QUANTITY: Decimal(16, 6)  @title: 'AVG_QUANTITY' ; 
        REPRESENTATIVE_PRODUCT: String(100)  @title: 'REPRESENTATIVE_PRODUCT' ; 
}