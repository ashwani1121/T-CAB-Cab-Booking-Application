const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const State = sequelize.define(
    'State', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        state_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        state_code: {
            type: DataTypes.STRING(5),
            allowNull: false,
            unique: true
        },
        capital: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        region: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        area_sq_km: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        population: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        established_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        official_language: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        districts_count: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    {
        tableName: 'states',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
module.exports = State;