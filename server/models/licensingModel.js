const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Licensing     = sequelize.define(
    'Licensing',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        license_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Format: LIC-IND-2025-0001'
        },
        client_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        company_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        domain: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        server_ip: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        plan: {
            type: DataTypes.ENUM('lifetime', 'monthly', 'yearly'),
            allowNull: false,
            defaultValue: 'lifetime'
        },
        expiry_on: {
            type: DataTypes.DATEONLY,
            allowNull: true, 
            comment: 'Only required for monthly/yearly plans. NULL for lifetime'
        },
        status: {
            type: DataTypes.ENUM('active', 'suspended', 'terminated'),
            allowNull: false,
            defaultValue: 'active'
        },
        last_ping: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: 'licenses',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

// Add instance method to check validity
Licensing.prototype.isValid = function() {
    if (this.status !== 'active') {
        return false;
    }
    
    // Lifetime plans never expire
    if (this.plan === 'lifetime') {
        return true;
    }
    
    // Check expiry for monthly/yearly
    if (this.expiry_on) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(this.expiry_on);
        expiryDate.setHours(0, 0, 0, 0);
        return expiryDate >= today;
    }
    
    return true;
};

module.exports = Licensing;