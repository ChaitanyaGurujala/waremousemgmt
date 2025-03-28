sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "../model/formatter"
], function (Controller, Filter, FilterOperator, JSONModel, MessageToast, MessageBox, Spreadsheet, formatter) {
    "use strict";

    return Controller.extend("warehouseui.controller.ProductPerformance", {
        formatter: formatter,
        
        onInit: function () {
            this.getRouter().getRoute("RouteS1").attachPatternMatched(this._onPatternMatched, this);
            
            // Initialize local view model
            var oViewModel = new JSONModel({
                busy: false,
                delay: 0,
                filterSettings: {
                    stockStatus: "All",
                    minStock: 0,
                    maxStock: 1000
                },
                sortSettings: {
                    key: "name",
                    descending: false
                }
            });
            this.getView().setModel(oViewModel, "viewModel");
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
            var oList = this.getView().byId("productPerformanceList");
            var oBinding = oList.getBinding("items");
            
            if (sQuery) {
                var aFilters = [
                    new Filter("name", FilterOperator.Contains, sQuery),
                    new Filter("sku", FilterOperator.Contains, sQuery)
                ];
                oBinding.filter(new Filter({
                    filters: aFilters,
                    and: false
                }));
            } else {
                oBinding.filter([]);
            }
        },
        
        onOpenFilter: function (oEvent) {
            var oButton = oEvent.getSource();
            var oViewModel = this.getView().getModel("viewModel");
            var oFilterSettings = oViewModel.getProperty("/filterSettings");
            
            // Create the dialog if it doesn't exist
            if (!this._oFilterDialog) {
                this._oFilterDialog = new sap.m.Dialog({
                    title: "Filter Products",
                    contentWidth: "400px",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "Stock Status", design: "Bold" }),
                                new sap.m.Select({
                                    selectedKey: "{viewModel>/filterSettings/stockStatus}",
                                    items: [
                                        new sap.ui.core.Item({ key: "All", text: "All" }),
                                        new sap.ui.core.Item({ key: "Good", text: "Good Stock" }),
                                        new sap.ui.core.Item({ key: "Low", text: "Low Stock" }),
                                        new sap.ui.core.Item({ key: "Critical", text: "Critical Stock" })
                                    ],
                                    width: "100%"
                                }),
                                new sap.m.Label({ text: "Current Stock Range", design: "Bold", class: "sapUiSmallMarginTop" }),
                                new sap.m.RangeSlider({
                                    min: 0,
                                    max: 1000,
                                    step: 1,
                                    value: "{viewModel>/filterSettings/minStock}",
                                    value2: "{viewModel>/filterSettings/maxStock}",
                                    width: "100%"
                                })
                            ],
                            width: "100%"
                        })
                    ],
                    beginButton: new sap.m.Button({
                        text: "Apply",
                        type: "Emphasized",
                        press: function () {
                            this._applyFilter();
                            this._oFilterDialog.close();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: "Reset",
                        press: function () {
                            oViewModel.setProperty("/filterSettings", {
                                stockStatus: "All",
                                minStock: 0,
                                maxStock: 1000
                            });
                            this._applyFilter();
                            this._oFilterDialog.close();
                        }.bind(this)
                    })
                });
                
                this.getView().addDependent(this._oFilterDialog);
            }
            
            this._oFilterDialog.open();
        },
        
        _applyFilter: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var oFilterSettings = oViewModel.getProperty("/filterSettings");
            var oList = this.getView().byId("productPerformanceList");
            var oBinding = oList.getBinding("items");
            var aFilters = [];
            
            // Add stock status filter
            if (oFilterSettings.stockStatus !== "All") {
                var nMinValue, nMaxValue;
                
                switch (oFilterSettings.stockStatus) {
                    case "Good":
                        nMinValue = 20;
                        aFilters.push(new Filter("currentStock", FilterOperator.GT, nMinValue));
                        break;
                    case "Low":
                        nMinValue = 10;
                        nMaxValue = 20;
                        aFilters.push(new Filter("currentStock", FilterOperator.BT, nMinValue, nMaxValue));
                        break;
                    case "Critical":
                        nMaxValue = 10;
                        aFilters.push(new Filter("currentStock", FilterOperator.LE, nMaxValue));
                        break;
                }
            }
            
            // Add stock range filter
            if (oFilterSettings.minStock > 0 || oFilterSettings.maxStock < 1000) {
                aFilters.push(new Filter("currentStock", FilterOperator.BT, oFilterSettings.minStock, oFilterSettings.maxStock));
            }
            
            // Apply filters
            if (aFilters.length > 0) {
                oBinding.filter(new Filter({
                    filters: aFilters,
                    and: true
                }));
            } else {
                oBinding.filter([]);
            }
        },
        
        onOpenSort: function (oEvent) {
            var oButton = oEvent.getSource();
            var oViewModel = this.getView().getModel("viewModel");
            var oSortSettings = oViewModel.getProperty("/sortSettings");
            
            // Create the dialog if it doesn't exist
            if (!this._oSortDialog) {
                this._oSortDialog = new sap.m.Dialog({
                    title: "Sort Products",
                    contentWidth: "400px",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "Sort By", design: "Bold" }),
                                new sap.m.Select({
                                    selectedKey: "{viewModel>/sortSettings/key}",
                                    items: [
                                        new sap.ui.core.Item({ key: "name", text: "Product Name" }),
                                        new sap.ui.core.Item({ key: "sku", text: "SKU" }),
                                        new sap.ui.core.Item({ key: "currentStock", text: "Current Stock" }),
                                        new sap.ui.core.Item({ key: "pendingSales", text: "Pending Sales" }),
                                        new sap.ui.core.Item({ key: "projectedStock", text: "Projected Stock" })
                                    ],
                                    width: "100%"
                                }),
                                new sap.m.CheckBox({
                                    text: "Descending Order",
                                    selected: "{viewModel>/sortSettings/descending}",
                                    class: "sapUiSmallMarginTop"
                                })
                            ],
                            width: "100%"
                        })
                    ],
                    beginButton: new sap.m.Button({
                        text: "Apply",
                        type: "Emphasized",
                        press: function () {
                            this._applySort();
                            this._oSortDialog.close();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            this._oSortDialog.close();
                        }.bind(this)
                    })
                });
                
                this.getView().addDependent(this._oSortDialog);
            }
            
            this._oSortDialog.open();
        },
        
        _applySort: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var oSortSettings = oViewModel.getProperty("/sortSettings");
            var oList = this.getView().byId("productPerformanceList");
            var oBinding = oList.getBinding("items");
            
            // Apply sort
            oBinding.sort(new sap.ui.model.Sorter(
                oSortSettings.key,
                oSortSettings.descending
            ));
        },
        
        onOrderMore: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oProduct = oContext.getObject();
            
            // Open dialog to create purchase order
            this._openCreatePurchaseOrderDialog(oProduct);
        },
        
        _openCreatePurchaseOrderDialog: function (oProduct) {
            var that = this;
            
            // Create dialog to order more of the product
            if (!this._oOrderDialog) {
                this._oOrderDialog = new sap.m.Dialog({
                    title: "Create Purchase Order",
                    contentWidth: "400px",
                    content: [
                        new sap.ui.layout.form.SimpleForm({
                            editable: true,
                            layout: "ResponsiveGridLayout",
                            content: [
                                new sap.m.Label({ text: "Product" }),
                                new sap.m.Text({
                                    text: {
                                        path: "name"
                                    }
                                }),
                                
                                new sap.m.Label({ text: "SKU" }),
                                new sap.m.Text({
                                    text: {
                                        path: "sku"
                                    }
                                }),
                                
                                new sap.m.Label({ text: "Current Stock" }),
                                new sap.m.Text({
                                    text: {
                                        path: "currentStock"
                                    }
                                }),
                                
                                new sap.m.Label({ text: "Order Quantity" }),
                                new sap.m.StepInput({
                                    value: 10,
                                    min: 1,
                                    max: 1000
                                })
                            ]
                        })
                    ],
                    beginButton: new sap.m.Button({
                        text: "Create Order",
                        type: "Emphasized",
                        press: function () {
                            // Create purchase order logic would go here
                            MessageToast.show("Purchase order created for " + oProduct.name);
                            that._oOrderDialog.close();
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            that._oOrderDialog.close();
                        }
                    })
                });
                
                this.getView().addDependent(this._oOrderDialog);
            }
            
            // Bind the dialog to the product context
            this._oOrderDialog.bindElement(oContext.getPath());
            this._oOrderDialog.setTitle("Order More: " + oProduct.name);
            
            this._oOrderDialog.open();
        },
        
        onViewDetails: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oProduct = oContext.getObject();
            var sProductId = oProduct.ID;
            
            // Navigate to product details
            this.getRouter().navTo("productDetail", {
                productId: sProductId
            });
        },
        
        onExport: function () {
            var oList = this.getView().byId("productPerformanceList");
            var oBinding = oList.getBinding("items");
            
            var mSettings = {
                workbook: {
                    columns: [
                        { label: "Product Name", property: "name" },
                        { label: "SKU", property: "sku" },
                        { label: "Current Stock", property: "currentStock", type: "number" },
                        { label: "Pending Sales", property: "pendingSales", type: "number" },
                        { label: "Pending Purchases", property: "pendingPurchases", type: "number" },
                        { label: "Recent Sales Count", property: "recentSalesCount", type: "number" },
                        { label: "Recent Sales Quantity", property: "recentSalesQuantity", type: "number" },
                        { label: "Projected Stock", property: "projectedStock", type: "number" },
                        { label: "Price", property: "price", type: "number" },
                        { label: "Currency", property: "currency" }
                    ]
                },
                dataSource: oBinding.getCurrentContexts().map(function(oContext) {
                    return oContext.getObject();
                }),
                fileName: "Product_Performance.xlsx"
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