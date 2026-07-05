const { DataTypes } = require('sequelize');
const sequelize     = require('../config/db').sequelize;
const Coupon        = sequelize.define('Coupon', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    coupon_type: {
        type: DataTypes.ENUM('general', 'firstride', 'referral', 'seasonal', 'targeted'),
        allowNull: false,
        defaultValue: 'general'
    },
    description: DataTypes.STRING(255),
    special_message: DataTypes.STRING(255),
    discount_type: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        allowNull: false
    },
    discount_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    max_discount: DataTypes.DECIMAL(10, 2),
    min_order_value: DataTypes.DECIMAL(10, 2),
    starts_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    usage_limit: DataTypes.INTEGER,
    per_user_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    vehicle_type_restrictions: DataTypes.STRING(255),
    is_public: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
    }, {
    tableName: 'promo_codes',
    timestamps: false
});
module.exports =  Coupon ;