using {warehouse as db} from '../db/data-model';

service WarehouseService @(path: '/warehouse') {
    entity Customers                   as projection on db.Customers;
    entity Vendors                     as projection on db.Vendors;
    entity Products                    as projection on db.Products;
    entity test2 as projection on db.test2;

    @cds.redirection.target
    entity Inventory                   as projection on db.Inventory;

    entity PurchaseOrders              as projection on db.PurchaseOrders;
    entity PurchaseOrderItems          as projection on db.PurchaseOrderItems;
    entity SalesOrders                 as projection on db.SalesOrders;
    entity SalesOrderItems             as projection on db.SalesOrderItems;
    entity OrderStatusList             as projection on db.OrderStatusList;


    @readonly
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

    function getProductAvailability(productId : String) returns {
        available : Integer;
        reserved : Integer;
        onOrder : Integer;
    };

    function getProductQuantity(productName: String) returns {available: Integer};
}
