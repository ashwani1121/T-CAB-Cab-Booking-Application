const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Services      = sequelize.define('Services', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255), 
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    polygon_coordinates: {
        type: DataTypes.JSON, 
        allowNull: true
    },
    vehicle_type_ids: {
        type: DataTypes.JSON, 
        allowNull: true
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
    tableName: 'services',
    timestamps: false
});
module.exports = Services;