const { DataTypes } = require('sequelize');
const { sequelize}  = require('../config/db');
const Trips      = sequelize.define(
    'Trips',
    {
        trip: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'trip', 
        },
        image: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'image',
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'created_at',
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'updated_at',
        },
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1, 
            validate: {
                isIn: [[0, 1]], 
            },
        }
    },
    {
        timestamps: true,
        underscored: true, 
        tableName: 'trips', 
    }
);
module.exports = Trips;