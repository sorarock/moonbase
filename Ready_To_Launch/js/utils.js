/* ============================================================================
   UTILITY FUNCTIONS
   Helper functions used throughout the application
   ============================================================================ */

const Utils = {
    /**
     * Generate a unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Format currency with commas and decimals
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code (THB or USD)
     * @param {boolean} showSymbol - Whether to show currency symbol (default: true)
     * @param {number} decimals - Number of decimal places (default: 2, use 6 for prices)
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount, currency = 'THB', showSymbol = true, decimals = 2) {
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(amount);
        
        if (!showSymbol) return formatted;
        return currency === 'THB' ? `฿${formatted}` : `$${formatted}`;
    },

    /**
     * Format number with commas
     * @param {number} num - Number to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number
     */
    formatNumber(num, decimals = 2) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    },

    /**
     * Format date to readable string
     * @param {Date|string} date - Date to format
     * @param {string} format - Format type ('short', 'long', 'iso', 'dd-mmm-yyyy')
     * @returns {string} Formatted date string
     */
    formatDate(date, format = 'short') {
        const d = typeof date === 'string' ? new Date(date) : date;
        
        if (format === 'iso') {
            return d.toISOString().split('T')[0];
        }
        
        if (format === 'long') {
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        if (format === 'dd-mmm-yyyy') {
            // DD MMM YYYY format (e.g., "02 Mar 2026")
            const day = d.getDate().toString().padStart(2, '0');
            const month = d.toLocaleDateString('en-US', { month: 'short' });
            const year = d.getFullYear();
            return `${day} ${month} ${year}`;
        }
        
        // Short format (MM/DD/YYYY)
        return d.toLocaleDateString('en-US');
    },

    /**
     * Format percentage
     * @param {number} value - Value to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted percentage
     */
    formatPercent(value, decimals = 2) {
        return `${value.toFixed(decimals)}%`;
    },

    /**
     * Calculate percentage change
     * @param {number} oldValue - Original value
     * @param {number} newValue - New value
     * @returns {number} Percentage change
     */
    calculatePercentChange(oldValue, newValue) {
        if (oldValue === 0) return 0;
        return ((newValue - oldValue) / oldValue) * 100;
    },

    /**
     * Calculate days between two dates
     * @param {Date|string} date1 - First date
     * @param {Date|string} date2 - Second date
     * @returns {number} Number of days
     */
    calculateDaysBetween(date1, date2) {
        const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
        const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * Calculate years between two dates
     * @param {Date|string} date1 - First date
     * @param {Date|string} date2 - Second date
     * @returns {number} Number of years (decimal)
     */
    calculateYearsBetween(date1, date2) {
        const days = this.calculateDaysBetween(date1, date2);
        return days / 365;
    },

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Validate positive number
     * @param {any} value - Value to validate
     * @returns {boolean} True if valid positive number
     */
    validatePositiveNumber(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    },

    /**
     * Validate percentage (0-100)
     * @param {any} value - Value to validate
     * @returns {boolean} True if valid percentage
     */
    validatePercentage(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 100;
    },

    /**
     * Deep clone an object
     * @param {object} obj - Object to clone
     * @returns {object} Cloned object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Debounce function execution
     * @param {function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Show notification message
     * @param {string} message - Message to display
     * @param {string} type - Type of notification ('success', 'error', 'warning', 'info')
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notification if any
        const existing = document.querySelector('.notification-toast');
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            padding: 16px 24px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;

        // Set color based on type
        const colors = {
            success: '#34C759',
            error: '#FF3B30',
            warning: '#FF9F0A',
            info: '#0071E3'
        };
        notification.style.borderLeft = `4px solid ${colors[type] || colors.info}`;

        // Add to body
        document.body.appendChild(notification);

        // Remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    /**
     * Confirm dialog
     * @param {string} message - Message to display
     * @returns {boolean} User confirmation
     */
    confirm(message) {
        return window.confirm(message);
    },

    /**
     * Toggle element visibility
     * @param {string|HTMLElement} element - Element or selector
     * @param {boolean} show - Force show/hide (optional)
     */
    toggleElement(element, show = null) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;

        if (show === null) {
            el.classList.toggle('hidden');
        } else {
            if (show) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    },

    /**
     * Scroll to element
     * @param {string|HTMLElement} element - Element or selector
     * @param {string} behavior - Scroll behavior ('smooth', 'auto')
     */
    scrollTo(element, behavior = 'smooth') {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;
        
        el.scrollIntoView({ behavior, block: 'start' });
    },

    /**
     * Get query parameter from URL
     * @param {string} param - Parameter name
     * @returns {string|null} Parameter value
     */
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    /**
     * Set query parameter in URL
     * @param {string} param - Parameter name
     * @param {string} value - Parameter value
     */
    setQueryParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.pushState({}, '', url);
    },

    /**
     * Local storage helper with error handling
     * @param {string} key - Storage key
     * @param {any} value - Value to store (if undefined, retrieves value)
     * @returns {any} Stored value (when retrieving)
     */
    storage(key, value = undefined) {
        try {
            if (value === undefined) {
                // Get value
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } else {
                // Set value
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            }
        } catch (error) {
            console.error('Storage error:', error);
            return null;
        }
    },

    /**
     * Session storage helper
     * @param {string} key - Storage key
     * @param {any} value - Value to store (if undefined, retrieves value)
     * @returns {any} Stored value (when retrieving)
     */
    sessionStorage(key, value = undefined) {
        try {
            if (value === undefined) {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } else {
                sessionStorage.setItem(key, JSON.stringify(value));
                return true;
            }
        } catch (error) {
            console.error('Session storage error:', error);
            return null;
        }
    },

    /**
     * Check if localStorage is available
     * @returns {boolean} True if available
     */
    isLocalStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Get localStorage usage
     * @returns {object} Storage usage info
     */
    getStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        
        const totalKB = (total / 1024).toFixed(2);
        const limitKB = 5120; // 5MB typical limit
        const usedPercent = ((total / (limitKB * 1024)) * 100).toFixed(2);
        
        return {
            used: totalKB,
            limit: limitKB,
            percent: usedPercent
        };
    },

    /**
     * Filter transactions up to as of date
     * @param {array} transactions - Array of transactions
     * @param {string} asOfDate - As of date (YYYY-MM-DD)
     * @returns {array} Filtered transactions
     */
    filterTransactionsByAsOfDate(transactions, asOfDate) {
        if (!asOfDate) return transactions;
        
        const cutoffDate = new Date(asOfDate);
        cutoffDate.setHours(23, 59, 59, 999); // End of day
        
        return transactions.filter(t => {
            const txnDate = new Date(t.date);
            return txnDate <= cutoffDate;
        });
    },

    /**
     * Check if transaction is in the future relative to as of date
     * @param {object} transaction - Transaction object
     * @param {string} asOfDate - As of date (YYYY-MM-DD)
     * @returns {boolean} True if transaction is in the future
     */
    isTransactionFuture(transaction, asOfDate) {
        if (!asOfDate) return false;
        
        const cutoffDate = new Date(asOfDate);
        cutoffDate.setHours(23, 59, 59, 999);
        const txnDate = new Date(transaction.date);
        
        return txnDate > cutoffDate;
    },

    /**
     * Count future transactions
     * @param {array} transactions - Array of transactions
     * @param {string} asOfDate - As of date (YYYY-MM-DD)
     * @returns {number} Count of future transactions
     */
    countFutureTransactions(transactions, asOfDate) {
        if (!asOfDate) return 0;
        
        return transactions.filter(t => this.isTransactionFuture(t, asOfDate)).length;
    }
};

// Add animation keyframes to document
if (!document.querySelector('#utils-animations')) {
    const style = document.createElement('style');
    style.id = 'utils-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other modules
window.Utils = Utils;