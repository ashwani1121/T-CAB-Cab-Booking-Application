const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const DriverDepositTransaction = sequelize.define(
    "DriverDepositTransaction",
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        driver_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "driver_id",
            comment: 'Foreign key referencing users(id)'
        },
        transaction_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            field: "transaction_id",
            comment: 'Unique transaction identifier'
        },
        transaction_type: {
            type: DataTypes.ENUM('deposit_paid', 'cancellation_charge', 'refund', 'adjustment'),
            allowNull: false,
            field: "transaction_type",
            comment: 'Type of transaction'
        },
        ride_request_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            field: "ride_request_id",
            comment: 'Related ride request for cancellation charges'
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            field: "amount",
            comment: 'Transaction amount (positive for deposits, negative for deductions)'
        },
        balance_before: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "balance_before",
            comment: 'Deposit balance before transaction'
        },
        balance_after: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "balance_after",
            comment: 'Deposit balance after transaction'
        },
        payment_method: {
            type: DataTypes.ENUM('cash', 'easebuzz', 'bank_transfer', 'adjustment'),
            allowNull: true,
            field: "payment_method"
        },
        payment_gateway: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'easebuzz',
            field: "payment_gateway"
        },
        gateway_transaction_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: "gateway_transaction_id"
        },
        gateway_payment_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: "gateway_payment_id"
        },
        gateway_order_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: "gateway_order_id"
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
            allowNull: false,
            defaultValue: 'pending',
            field: "status"
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: false,
            field: "description",
            comment: 'Description of the transaction'
        },
        cancellation_count: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "cancellation_count",
            comment: 'Driver daily cancellation count when charge was applied'
        },
        cancellation_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: "cancellation_date",
            comment: 'Date of cancellation (for tracking daily limit)'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            field: "metadata",
            comment: 'Additional transaction details in JSON'
        },
        processed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "processed_at"
        },
        failed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "failed_at"
        },
        failure_reason: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: "failure_reason"
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: "created_at"
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: "updated_at"
        }
    },
    {
        timestamps: true,
        underscored: true,
        tableName: "driver_deposit_transactions",
        comment: 'Tracks all driver deposit-related transactions'
    }
);

module.exports = DriverDepositTransaction;