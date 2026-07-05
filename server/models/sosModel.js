const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const SOS = sequelize.define(
    'SOS',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        alert_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        ride_request_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
            validate: {
                min: -90,
                max: 90
            }
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
            validate: {
                min: -180,
                max: 180
            }
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('logged', 'resolved', 'false_alarm'),
            defaultValue: 'logged',
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        resolved_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        // Virtual field for location object
        location: {
            type: DataTypes.VIRTUAL,
            get() {
                const lat = this.getDataValue('latitude');
                const lng = this.getDataValue('longitude');
                if (lat && lng) {
                    return {
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lng)
                    };
                }
                return null;
            }
        }
    },
    {
        tableName: 'sos',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

module.exports = SOS;