const { DataTypes }  = require('sequelize');
const { sequelize }  = require('../config/db');
const DriverLocation = sequelize.define(
    'DriverLocation',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        driver_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
            validate: {
                isValidLatitude(value) {
                    if (value !== null && (value < -90 || value > 90)) {
                        throw new Error('Latitude must be between -90 and 90');
                    }
                }
            }
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
            validate: {
                isValidLongitude(value) {
                    if (value !== null && (value < -180 || value > 180)) {
                        throw new Error('Longitude must be between -180 and 180');
                    }
                }
            }
        },
        is_online: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        last_updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        last_online_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when driver last went online'
        },
        last_offline_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when driver last went offline'
        },
    },
    {
        tableName: 'driver_locations',
        timestamps: false,
        indexes: [
            {
                fields: ['driver_id'],
                name: 'unique_driver_id',
                unique: true,
            },
            {
                fields: ['is_online', 'last_updated_at'],
                name: 'idx_online_updated',
            },
            {
                fields: ['is_online', 'latitude', 'longitude'],
                name: 'idx_online_location',
            },
            {
                fields: ['last_online_at'],
                name: 'idx_last_online',
            },
            {
                fields: ['last_offline_at'],
                name: 'idx_last_offline',
            },
        ],
        hooks: {
            beforeCreate: (driverLocation) => {
                const now = new Date();
                if(driverLocation.is_online){
                    driverLocation.last_online_at = now;
                }else{
                    driverLocation.last_offline_at = now;
                }
                driverLocation.last_updated_at = now;
            },
            
            beforeUpdate: (driverLocation) => {
                const now = new Date();
                // Update timestamps based on status change
                if(driverLocation.changed('is_online')){
                    if(driverLocation.is_online){
                        driverLocation.last_online_at = now;
                    }else{
                        driverLocation.last_offline_at = now;
                        // Clear location when going offline
                        driverLocation.latitude = null;
                        driverLocation.longitude = null;
                    }
                }
                // Always update the last_updated_at timestamp
                driverLocation.last_updated_at = now;
            },
        },
        validate: {
            // Custom validation to ensure location is provided when online
            locationRequiredWhenOnline() {
                if (this.is_online && (!this.latitude || !this.longitude)) {
                    throw new Error('Latitude and longitude are required when driver is online');
                }
            },
            // Ensure both latitude and longitude are provided together
            coordinatesPairValidation() {
                const hasLat = this.latitude !== null && this.latitude !== undefined;
                const hasLng = this.longitude !== null && this.longitude !== undefined;
                if (hasLat !== hasLng) {
                    throw new Error('Both latitude and longitude must be provided together or both must be null');
                }
            }
        }
    }
);

module.exports = DriverLocation;