sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("warehouseui.controller.InventoryLookup", {
        onInit: function () {
            // Initialize view model
            var oViewModel = new JSONModel({
                productName: "",
                productQuantities: null,
                busy: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Prepare products model for value help
            var oProductsModel = new JSONModel({
                products: []
            });
            this.getView().setModel(oProductsModel, "products");
            
            // Load products for value help
            this._loadProducts();
        },
        
        _loadProducts: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var oProductsModel = this.getView().getModel("products");
            
            oViewModel.setProperty("/busy", true);
            
            // For development/testing, set some sample products
            var aProducts = [
                { name: "Premium Wireless Headphones", sku: "WH-1001", stock: 45 },
                { name: "Bluetooth Speaker Pro", sku: "BS-2002", stock: 32 },
                { name: "Smart Watch Elite", sku: "SW-3003", stock: 9 },
                { name: "Ultra HD 4K Monitor", sku: "MON-4004", stock: 15 },
                { name: "Gaming Laptop", sku: "GL-5005", stock: 22 },
                { name: "Wireless Mouse", sku: "WM-6006", stock: 38 }
            ];
            
            oProductsModel.setProperty("/products", aProducts);
            oViewModel.setProperty("/busy", false);
        },
        
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        },
        
        onValueHelpRequest: function (oEvent) {
            var sInputValue = oEvent.getSource().getValue();
            
            // Create value help dialog
            if (!this._oValueHelpDialog) {
                this._oValueHelpDialog = new sap.m.SelectDialog({
                    title: "Select Product",
                    items: {
                        path: "products>/products",
                        template: new sap.m.StandardListItem({
                            title: "{products>name}",
                            description: "{products>sku}",
                            info: "Stock: {products>stock}"
                        })
                    },
                    search: this.onValueHelpSearch.bind(this),
                    confirm: this.onValueHelpConfirm.bind(this),
                    cancel: function () {
                        this._oValueHelpDialog.close();
                    }.bind(this)
                });
                this.getView().addDependent(this._oValueHelpDialog);
            }
            
            // Open the dialog
            this._oValueHelpDialog.open(sInputValue);
        },
        
        onValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter(
                "name",
                FilterOperator.Contains,
                sValue
            );
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },
        
        onValueHelpConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var oViewModel = this.getView().getModel("viewModel");
                var sProductName = oSelectedItem.getTitle();
                
                oViewModel.setProperty("/productName", sProductName);
                
                // Automatically search for the selected product
                this.onSearch();
            }
        },
        
        onSubmit: function (oEvent) {
            this.onSearch();
        },
        
        onSearch: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var sProductName = oViewModel.getProperty("/productName");
            var oModel = this.getView().getModel();
            
            if (!sProductName) {
                sap.m.MessageToast.show("Please enter a product name");
                return;
            }
            
            oViewModel.setProperty("/busy", true);
            
            // Directly call the API
            var sServiceUrl = oModel.sServiceUrl || "/warehouse/";
            var sUrl = sServiceUrl + "getProductQuantitiesByName(productName='" + encodeURIComponent(sProductName) + "')";
            
            // Use jQuery AJAX to make the request
            jQuery.ajax({
                url: sUrl,
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                },
                success: function(oData) {
                    // OData V4 wraps the result in a "value" property
                    var oQuantities = oData.value || oData;
                    oViewModel.setProperty("/productQuantities", oQuantities);
                    oViewModel.setProperty("/busy", false);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    oViewModel.setProperty("/busy", false);
                    sap.m.MessageBox.error("Error retrieving product quantities: " + errorThrown);
                    console.error("Error retrieving product quantities", jqXHR.responseJSON || errorThrown);
                }
            });
        }
    });
});