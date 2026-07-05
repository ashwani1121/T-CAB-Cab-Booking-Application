const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Vehicletypes  = sequelize.define('Vehicletypes', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    image: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    map_image: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    animation: {
        type: DataTypes.TEXT,
        allowNull: true 
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    vehicle_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'vehicles',
            key: 'id',
        },
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    commission: {                         
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
    }
}, {
    tableName: 'vehicle_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
module.exports = Vehicletypes;