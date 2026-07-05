const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;

const UserCoupon = sequelize.define('UserCoupon', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    promo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'promo_codes',
            key: 'id'
        }
    },
    is_used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    valid_until: {
        type: DataTypes.DATE,
        allowNull: true
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
    }
}, {
    tableName: 'user_coupons',
    timestamps: false
});

module.exports = UserCoupon;