sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, Spreadsheet, MessageToast) {
    "use strict";

    return Controller.extend("warehouseui.controller.InventoryByLocation", {
        onInit: function () {
            // Initialize the view model
            var oViewModel = new JSONModel({
                busy: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Optional: Reset filters when view is loaded
            this.getRouter().getRoute("inventoryByLocation").attachPatternMatched(this._onPatternMatched, this);
        },
        
        _onPatternMatched: function (oEvent) {
            // Refresh data when route is matched
            this.getView().getModel().refresh();
        },
        
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },
        
        onNavBack: function () {
            this.getRouter().navTo("dashboard");
        },
        
        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.getView().byId("inventoryTable");
            var oBinding = oTable.getBinding("items");
            
            if (sQuery) {
                var oFilter = new Filter("location", FilterOperator.Contains, sQuery);
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },
        
        onLocationPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sLocation = oContext.getProperty("location");
            
            // Navigate to location details
            this.getRouter().navTo("locationDetail", {
                location: sLocation
            });
        },
        
        onViewLocationDetails: function (oEvent) {
            // Stop the event from propagating to the parent container
            oEvent.stopPropagation();
            
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();
            var sLocation = oContext.getProperty("location");
            
            // Navigate to location details
            this.getRouter().navTo("locationDetail", {
                location: sLocation
            });
        },
        
        onExport: function () {
            var oTable = this.getView().byId("inventoryTable");
            var oBinding = oTable.getBinding("items");
            
            var mSettings = {
                workbook: {
                    columns: [
                        { label: "Location", property: "location" },
                        { label: "Total Quantity", property: "total_quantity", type: "number" },
                        { label: "Available Quantity", property: "available_quantity", type: "number" },
                        { label: "Reserved Quantity", property: "reserved_quantity", type: "number" }
                    ],
                    hierarchyLevel: 'Level'
                },
                dataSource: oBinding.getCurrentContexts().map(function(oContext) {
                    return oContext.getObject();
                }),
                fileName: "Inventory_By_Location.xlsx"
            };
            
            var oSpreadsheet = new Spreadsheet(mSettings);
            oSpreadsheet.build()
                .then(function() {
                    MessageToast.show("Spreadsheet export has finished");
                })
                .catch(function(sMessage) {
                    MessageToast.show("Export error: " + sMessage);
                })
                .finally(function() {
                    oSpreadsheet.destroy();
                });
        }
    });
});