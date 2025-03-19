const cds = require('@sap/cds');
const { v4: uuidv4 } = require('uuid');


module.exports = cds.service.impl(async function () {

    const db = await cds.connect.to('db');

    // Function Implementation
    this.on('getInventoryQuantityByName', async (req) => {
        const { productName } = req.data;

        // Check if the product name is provided
        if (!productName) {
            req.error(400, 'Product name is required');
            return;
        }

        try {
            // Query Inventory based on product name
            const result = await SELECT
                .from('warehouse.Inventory as i')
                .join('warehouse.Products as p').on('i.product_ID = p.ID')
                .columns('sum(i.quantity) as availableQuantity')
                .where({ 'p.name': productName });

            // Extract the available quantity
            const availableQuantity = Number(result[0]?.availableQuantity) || 0;

            // Return the result
            return {
                productName: productName,
                availableQuantity: availableQuantity
            };

        } catch (error) {
            console.error('Error fetching product quantity:', error);
            req.error(500, `Failed to retrieve quantity: ${error.message}`);
        }
    });

    // Get Product Total Quantity [Inventory, SalesOrders, PurchaseOrders]
    // this.on('getProductQuantitiesByName', async (req) => {
    //     const { productName } = req.data;
    
    //     if (!productName) {
    //         return req.error(400, 'Product name is required');
    //     }
    
    //     try {
    //         // Call the procedure
    //         const query = `CALL "76FCA547DD2442179035F50A938795B1"."GET_PRODUCT_TOTAL_INVENTORY_QTY"(?, ?, ?, ?)`;
    
    //         // Declare variables for the OUT parameters (these will be set by the procedure)
    //         let inventory_qty = 0;
    //         let sales_order_qty = 0;
    //         let purchase_order_qty = 0;
    
    //         // Execute the procedure with the input and output parameters
    //         const result = await db.run(query, [
    //             productName,          // Input parameter
    //             { out: 'inventory_qty', value: inventory_qty }, // OUT parameter for inventory_qty
    //             { out: 'sales_order_qty', value: sales_order_qty }, // OUT parameter for sales_order_qty
    //             { out: 'purchase_order_qty', value: purchase_order_qty } // OUT parameter for purchase_order_qty
    //         ]);
    
    //         // Access the output values from the result object
    //         inventory_qty = result[1];  // This should correspond to inventory_qty
    //         sales_order_qty = result[2]; // This should correspond to sales_order_qty
    //         purchase_order_qty = result[3]; // This should correspond to purchase_order_qty
    
    //         // Log the result
    //         console.log('Procedure result:', result);
    
    //         // Return the result
    //         return {
    //             productName: productName,
    //             inventoryQuantity: inventory_qty,
    //             salesOrderQuantity: sales_order_qty,
    //             purchaseOrderQuantity: purchase_order_qty
    //         };
    //     } catch (error) {
    //         console.error('Error executing procedure:', error);
    //         return req.error(500, `Failed to retrieve product quantities: ${error.message}`);
    //     }
    // });

    this.on('getProductQuantitiesByName', async (req) => {
        const { productName } = req.data;
    
        if (!productName) {
            return req.error(400, 'Product name is required');
        }
    
        try {
            // Call the procedure
            let query = `CALL GET_PRODUCT_TOTAL_INVENTORY_QTY(PRODUCT_NAME=>'${productName}', 
	                                                        INVENTORY_QTY => ?,
	                                                        SALES_ORDER_QTY => ?,
	                                                        PURCHASE_ORDER_QTY => ?)`;
           const result =  await db.run(query,{});
    
            // Access the output values from the result object
            // INVENTORY_QTY = result['INVENTORY_QTY'];  // This should correspond to inventory_qty
            SALES_ORDER_QTY = result['SALES_ORDER_QTY']; // This should correspond to sales_order_qty
            PURCHASE_ORDER_QTY = result['PURCHASE_ORDER_QTY']; // This should correspond to purchase_order_qty
    
            // Log the result
            console.log('Procedure result:', result);
    
            // Return the result
            return {
                productName: productName,
                inventoryQuantity: result['INVENTORY_QTY'],
                salesOrderQuantity: SALES_ORDER_QTY,
                purchaseOrderQuantity: PURCHASE_ORDER_QTY
            };
        } catch (error) {
            console.error('Error executing procedure:', error);
            return req.error(500, `Failed to retrieve product quantities: ${error.message}`);
        }
    });






    
    

    // Create Sales Order 
    this.on('createSalesOrderByNames', async (req) => {
        const { customerName, items, needByDate, currency = 'USD' } = req.data;
        
        // Input validation
        if (!customerName) {
            return req.error(400, 'Customer name is required');
        }
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return req.error(400, 'At least one item is required');
        }
        
        // Use a transaction to ensure data consistency
        const tx = cds.transaction(req);
        
        try {
            // 1. Look up customer ID by name - using native SQL to avoid CDS parsing issues
            const customerQuery = `
                SELECT * FROM WAREHOUSE_CUSTOMERS 
                WHERE UPPER(NAME) = UPPER(?)
            `;
            
            const customerResult = await tx.run(customerQuery, [customerName]);
            
            if (!customerResult || customerResult.length === 0) {
                return req.error(400, `Customer with name "${customerName}" not found`);
            }
            
            const customer = customerResult[0];
            const customerId = customer.ID;
            
            // 2. Create the sales order header
            const salesOrderId = uuidv4();
            const orderDate = new Date();
            const requestedDeliveryDate = needByDate ? new Date(needByDate) : new Date(orderDate.getTime() + 7*24*60*60*1000);
            
            // 3. Prepare and validate all items before creating any records
            const orderItems = [];
            let totalAmount = 0;
            
            for (const item of items) {
                if (!item.productName || !item.quantity || item.quantity <= 0) {
                    return req.error(400, 'Each item must have a valid product name and a positive quantity');
                }
                
                // Look up product ID by name - using native SQL
                const productQuery = `
                    SELECT * FROM WAREHOUSE_PRODUCTS
                    WHERE UPPER(NAME) = UPPER(?)
                `;
                
                const productResult = await tx.run(productQuery, [item.productName]);
                
                if (!productResult || productResult.length === 0) {
                    return req.error(400, `Product with name "${item.productName}" not found`);
                }
                
                const product = productResult[0];
                const productId = product.ID;
                
                // Check inventory availability - using native SQL
                const inventoryQuery = `
                    SELECT SUM(QUANTITY) AS AVAILABLE 
                    FROM WAREHOUSE_INVENTORY
                    WHERE PRODUCT_ID = ?
                `;
                
                const inventoryResult = await tx.run(inventoryQuery, [productId]);
                
                const available = Number(inventoryResult[0]?.AVAILABLE || 0);
                if (available < item.quantity) {
                    return req.error(400, `Insufficient inventory for product "${item.productName}": Requested ${item.quantity}, Available: ${available}`);
                }
                
                const unitPrice = Number(product.PRICE) || 0;
                const price = unitPrice * item.quantity;
                totalAmount += price;
                
                // Create order item entry
                const orderItem = {
                    ID: uuidv4(),
                    salesOrder_ID: salesOrderId,
                    product_ID: productId,
                    quantity: item.quantity,
                    unitPrice: unitPrice,
                    price: price,
                    currency: currency
                };
                
                orderItems.push({
                    dbRecord: orderItem,
                    displayInfo: {
                        productName: product.NAME,
                        quantity: item.quantity,
                        unitPrice: unitPrice,
                        price: price
                    }
                });
            }
            
            // 4. Insert the sales order header
            const salesOrder = {
                ID: salesOrderId,
                customer_ID: customerId,
                status_code: 'Pending',
                needByDate: requestedDeliveryDate,
                totalAmount: totalAmount,
                currency: currency,
                createdAt: orderDate,
                createdBy: req.user?.id || 'system',
                modifiedAt: orderDate,
                modifiedBy: req.user?.id || 'system'
            };
            
            await tx.run(INSERT.into('warehouse.SalesOrders').entries(salesOrder));
            
            // 5. Insert all order items (database records only)
            const dbOrderItems = orderItems.map(item => item.dbRecord);
            await tx.run(INSERT.into('warehouse.SalesOrderItems').entries(dbOrderItems));
            
            // 6. Commit the transaction
            await tx.commit();
            
            // 7. Return user-friendly response with names instead of IDs
            return {
                salesOrderId: salesOrderId,
                customerName: customer.NAME,
                orderDate: orderDate,
                deliveryDate: requestedDeliveryDate,
                items: orderItems.map(item => item.displayInfo),
                totalAmount: totalAmount,
                currency: currency,
                status: 'Created'
            };
            
        } catch (error) {
            // Transaction will be rolled back automatically
            console.error('Error creating sales order:', error);
            return req.error(500, `Failed to create sales order: ${error.message}`);
        }
    });

    // Update Sales Order Status 
    this.on('updateSalesOrderStatus', async (req) => {
    const { salesOrderId, status } = req.data;
    
    if (!salesOrderId) {
        return req.error(400, 'Sales order ID is required');
    }
    
    if (status !== 'Shipped' && status !== 'Cancelled') {
        return req.error(400, 'Status must be either "Shipped" or "Cancelled"');
    }
    
    // Start a transaction
    const tx = cds.transaction(req);
    
    try {
        // 1. Check if the sales order exists
        const salesOrder = await tx.run(
            SELECT.one.from('warehouse.SalesOrders')
            .where({ ID: salesOrderId })
        );
        
        if (!salesOrder) {
            return req.error(404, `Sales order with ID ${salesOrderId} not found`);
        }
        
        // 2. Check if the status can be updated (only from Pending)
        if (salesOrder.status_code !== 'Pending') {
            return req.error(400, `Cannot update sales order that is already ${salesOrder.status_code}`);
        }
        
        // 3. Get the items for this sales order
        const orderItems = await tx.run(
            SELECT.from('warehouse.SalesOrderItems')
            .where({ salesOrder_ID: salesOrderId })
        );
        
        if (!orderItems || orderItems.length === 0) {
            return req.error(400, 'No items found for this sales order');
        }
        
        // 4. Handle based on requested status
        if (status === 'Cancelled') {
            // Delete the sales order items first (due to foreign key constraints)
            await tx.run(
                DELETE.from('warehouse.SalesOrderItems')
                .where({ salesOrder_ID: salesOrderId })
            );
            
            // Then delete the sales order itself
            await tx.run(
                DELETE.from('warehouse.SalesOrders')
                .where({ ID: salesOrderId })
            );
            
            // Commit changes
            await tx.commit();
            
            // Return success response
            return {
                salesOrderId: salesOrderId,
                status: 'Cancelled',
                message: `Sales order ${salesOrderId} has been cancelled and removed`,
                itemCount: orderItems.length
            };
            
        } else if (status === 'Shipped') {
            // Update the sales order status and set the delivery date
            await tx.run(
                UPDATE('warehouse.SalesOrders')
                .set({
                    status_code: 'Shipped',
                    deliveryDate: new Date() // Set delivery date to today
                })
                .where({ ID: salesOrderId })
            );
            
            // Update inventory for each item (reduce inventory since products are shipped)
            for (const item of orderItems) {
                // Get current inventory for this product
                const inventoryItems = await tx.run(
                    SELECT.from('warehouse.Inventory')
                    .where({ product_ID: item.product_ID })
                    .orderBy('quantity DESC') // Process locations with highest quantity first
                );
                
                if (!inventoryItems || inventoryItems.length === 0) {
                    return req.error(400, `No inventory found for product ID ${item.product_ID}`);
                }
                
                // Calculate how much quantity we still need to deduct
                let remainingQuantity = item.quantity;
                
                // Update inventory records one by one until we've deducted all quantity
                for (const invItem of inventoryItems) {
                    if (remainingQuantity <= 0) break;
                    
                    const deductAmount = Math.min(invItem.quantity, remainingQuantity);
                    const newQuantity = invItem.quantity - deductAmount;
                    remainingQuantity -= deductAmount;
                    
                    // Update this inventory record
                    await tx.run(
                        UPDATE('warehouse.Inventory')
                        .set({ quantity: newQuantity })
                        .where({ ID: invItem.ID })
                    );
                }
                
                // Check if we couldn't deduct all quantity
                if (remainingQuantity > 0) {
                    return req.error(400, `Insufficient inventory for product ID ${item.product_ID}`);
                }
            }
            
            // Commit all changes
            await tx.commit();
            
            // Return success response
            return {
                salesOrderId: salesOrderId,
                status: 'Shipped',
                message: `Sales order ${salesOrderId} has been marked as Shipped`,
                deliveryDate: new Date(),
                itemCount: orderItems.length
            };
        }
        
    } catch (error) {
        console.error('Error updating sales order status:', error);
        return req.error(500, `Failed to update sales order: ${error.message}`);
    }
    });


// Update Sales Order Status by using Procedure
// this.on('updateSalesOrderStatusProcedure', async (req) => {
//     const { salesOrderId, status } = req.data;
    
//     // Basic validation
//     if (!salesOrderId) {
//         return req.error(400, 'Sales order ID is required');
//     }
    
//     if (!status) {
//         return req.error(400, 'Status is required');
//     }
    
//     try {
//         console.log(`Calling stored procedure to update sales order ${salesOrderId} to status ${status}`);
        
//         // Call the stored procedure
//         const result = await db.run({
//             objectName: 'update_sales_order_status',
//             parameters: [
//                 { name: 'sales_order_id', value: salesOrderId },
//                 { name: 'new_status', value: status },
//                 { name: 'success', type: 'BOOLEAN', direction: 'OUT' },
//                 { name: 'message', type: 'NVARCHAR', direction: 'OUT' }
//             ]
//         });
        
//         console.log('Procedure result:', result);
        
//         // Check the success flag from the procedure
//         if (!result.success) {
//             return req.error(400, result.message);
//         }
        
//         // Add additional information for the client
//         const response = {
//             salesOrderId: salesOrderId,
//             status: status,
//             message: result.message,
//             timestamp: new Date()
//         };
        
//         // If the order was received rather than cancelled, include the delivery date
//         if (status === 'Received') {
//             response.deliveryDate = new Date();
//         }
        
//         return response;
        
//     } catch (error) {
//         console.error('Error calling update_sales_order_status procedure:', error);
        
//         // Try to extract a more specific error message if available
//         const errorMessage = error.message || 'Unknown error occurred';
        
//         return req.error(500, `Failed to update sales order status: ${errorMessage}`);
//     }
// });
   

});
