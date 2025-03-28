sap.ui.define([], function() {
    "use strict";
    
    return {
        /**
         * Formats the stock status text based on current stock level
         *
         * @param {int} iCurrentStock - The current stock level
         * @return {string} The status text
         */
        stockStatusText: function(iCurrentStock) {
            if (iCurrentStock <= 10) {
                return "Critical Stock";
            } else if (iCurrentStock <= 20) {
                return "Low Stock";
            } else {
                return "Good Stock";
            }
        },
        
        /**
         * Formats the stock status state based on current stock level
         *
         * @param {int} iCurrentStock - The current stock level
         * @return {string} The UI5 status state (Success, Warning, Error)
         */
        stockStatusState: function(iCurrentStock) {
            if (iCurrentStock <= 10) {
                return "Error";
            } else if (iCurrentStock <= 20) {
                return "Warning";
            } else {
                return "Success";
            }
        },
        
        /**
         * Formats a price with its currency
         *
         * @param {float} fPrice - The price value
         * @param {string} sCurrency - The currency code
         * @return {string} The formatted price with currency
         */
        price: function(fPrice, sCurrency) {
            if (!fPrice) {
                return "";
            }
            
            return fPrice.toFixed(2) + " " + sCurrency;
        },
        
        /**
         * Formats a date
         *
         * @param {string} sDate - The date string
         * @return {string} The formatted date
         */
        date: function(sDate) {
            if (!sDate) {
                return "";
            }
            
            var oDate = new Date(sDate);
            return oDate.toLocaleDateString();
        }
    };
});