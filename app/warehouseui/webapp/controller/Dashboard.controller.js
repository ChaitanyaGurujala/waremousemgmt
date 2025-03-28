sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("warehouseui.controller.Dashboard", {
        onInit: function () {
            // Initialization code if needed
        },
        
        onNavToProductPerformance: function () {
            this.getOwnerComponent().getRouter().navTo("productPerformance");
        },
        
        onNavToInventoryLookup: function () {
            this.getOwnerComponent().getRouter().navTo("inventoryLookup");
        },
        
        onNavToSalesOrders: function () {
            // Route not implemented yet
            sap.m.MessageToast.show("Sales Orders feature coming soon");
        },
        onNavToInventoryByLocation: function () {
            this.getOwnerComponent().getRouter().navTo("inventoryByLocation");
        },
        
        onNavToPurchaseOrders: function () {
            // Route not implemented yet
            sap.m.MessageToast.show("Purchase Orders feature coming soon");
        }
    });
});