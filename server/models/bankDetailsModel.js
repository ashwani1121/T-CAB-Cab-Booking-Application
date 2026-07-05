const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const BankDetails   = sequelize.define(
    'BankDetails',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        type: {
            type: DataTypes.ENUM('account', 'upi'),
            allowNull: false,
            defaultValue: 'account',
            comment: 'Type of payment method: account or upi'
        },
        account_holder_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Name for both account and UPI'
        },
        account_number: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Bank account number (required for account type)'
        },
        ifsc_code: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'IFSC code (required for account type)'
        },
        bank_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Bank name (optional for account type)'
        },
        upi_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'UPI ID (required for upi type)'
        },
        is_primary: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0,
            comment: '1 = yes, 0 = no'
        },
        status: {
            type: DataTypes.TINYINT,
            defaultValue: 1,
            comment: '1 = Active, 0 = Inactive'
        }
    },
    {
        tableName: 'bank_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                name: 'idx_user_id',
                fields: ['user_id']
            },
            {
                name: 'idx_type',
                fields: ['type']
            },
            {
                name: 'idx_status',
                fields: ['status']
            }
        ]
    }
);
module.exports = BankDetails;