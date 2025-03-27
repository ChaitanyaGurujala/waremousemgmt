using {warehouse as db} from '../db/data-model';

@requires: 'authenticated-user'
service WarehouseService @(path: '/warehouse') {
    
    @(
  insertable: {grant: ['Write']},
  readable: {grant:['Read']},
  deletable: {grant: ['Admin']})
  entity Customers                   as projection on db.Customers;
    

    entity Vendors                     as projection on db.Vendors;
    @cds.redirection.target 
    entity Products                    as projection on db.Products;

    @cds.redirection.target
    entity Inventory                   as projection on db.Inventory;
    entity PurchaseOrders              as projection on db.PurchaseOrders;
    entity PurchaseOrderItems          as projection on db.PurchaseOrderItems;
    entity SalesOrders                 as projection on db.SalesOrders;
    entity SalesOrderItems             as projection on db.SalesOrderItems;
    entity OrderStatusList             as projection on db.OrderStatusList;
    @readonly // AnalyticalView using CDS 
    entity ProductPerformance as projection on db.ProductPerformanceView {
        *,
        currentStock       : Integer,
        pendingSales       : Integer,
        pendingPurchases   : Integer,
        recentSalesCount   : Integer,
        recentSalesQuantity: Integer,
        projectedStock     : Integer
    };

    @readonly //Simple View using CDS
    entity InventoryWithProductDetails as
        select from db.Inventory {
            ID,
            warehouseLocation,
            quantity,
            product.ID       as product_ID,
            product.name     as product_Name,
            product.sku      as product_SKU,
            product.price    as product_Price,
            product.currency as product_Currency
        };

    @readonly //hdb view artifact created and exposed
    entity InventoryStatusByLocation as projection on db.inventory_status_by_location;

    function getInventoryQuantityByName(productName: String) returns {
        productName: String;
        availableQuantity: Integer;
    };

    function getProductQuantitiesByName(productName:String) returns {
        productName: String;
        invQuantity: Integer;
        salesOrderQuantity: Integer;
        purchaseOrderQuantity: Integer;
    };
    @(requires:{grant:['Write']})
    action createSalesOrderByNames(
        customerName: String,
        items: many {
            productName: String;
            quantity: Integer
        },
        needByDate: Date,
        currency: String
    ) returns {
        salesOrderId: String;
        customerName: String;
        orderDate: Date;
        deliveryDate: Date;
        items: many {
            productName: String;
            quantity: Integer;
            unitPrice: Decimal;
            price: Decimal;
        };
        totalAmount: Decimal;
        currency: String;
        status: String;
    };


    action updateSalesOrderStatus(
    salesOrderId: String,
    status: String
) returns {
    salesOrderId: String;
    status: String;
    message: String;
    deliveryDate: Date;
    itemCount: Integer
}};