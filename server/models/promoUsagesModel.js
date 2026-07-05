const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;

const PromoUsage = sequelize.define('PromoUsage', {
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
    ride_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'ride_requests',
            key: 'id'
        }
    },
    discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'promo_usages',
    timestamps: false
});

module.exports = PromoUsage;