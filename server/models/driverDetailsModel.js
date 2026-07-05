const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DriverDetails = sequelize.define(
    'DriverDetails',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        mobile_code: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: '+91',
        },
        dob: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        driver_type: {
            type: DataTypes.ENUM('nefa_driver', 'registered_driver'),
            allowNull: false,
            defaultValue: 'registered_driver',
            comment: 'Type of driver: nefa_driver(Driver who nefa has) or registered_driver(common driver who registered)',
        },
        vehicle_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'vehicles',
                key: 'id',
            },
        },
        vehicle_type_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'vehicle_types',
                key: 'id',
            },
        },
        aadhar_no: {
            type: DataTypes.STRING(12),
            allowNull: false,
            unique: true,
        },
        rating: {
            type: DataTypes.STRING(12),
            allowNull: true,
            unique: true,
        },
        aadhar_front_image: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        aadhar_back_image: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        license_number: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        license_front_image: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        license_back_image: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        vehicle_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
        },
        vehicle_rc_no: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        vehicle_rc_front_image: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        vehicle_rc_back_image: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        vehicle_images: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: 'JSON array of vehicle image filenames',
        },
        deposit_balance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: "deposit_balance",
            comment: 'Current deposit balance after all transactions'
        },
        deposit_status: {
            type: DataTypes.ENUM('pending', 'paid', 'refunded'),
            allowNull: false,
            defaultValue: 'pending',
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
            allowNull: false,
            defaultValue: 'pending',
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Reason for rejection when status is rejected',
        },
        rules_accepted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether driver has accepted rules and regulations'
        },
        rules_accepted_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when driver accepted rules and regulations'
        },
        deletion_request: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 0,
            comment: '0: No request, 1: Deletion requested, 2: Deletion approved (to be processed)'
        },
        deletion_requested_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when deletion was requested'
        },
        deletion_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Reason provided by driver for account deletion'
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: 'driver_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['user_id'],
                name: 'uk_user_id',
            },
            {
                unique: true,
                fields: ['aadhar_no'],
                name: 'uk_aadhar_no',
            },
            {
                unique: true,
                fields: ['license_number'],
                name: 'uk_license_number',
            },
            {
                unique: true,
                fields: ['vehicle_rc_no'],
                name: 'uk_vehicle_rc_no',
            },
        ],
        hooks: {
            beforeCreate: (driverDetails) => {
                if (Array.isArray(driverDetails.vehicle_images)) {
                    driverDetails.vehicle_images = JSON.stringify(driverDetails.vehicle_images);
                }
            },
            beforeUpdate: (driverDetails) => {
                if (Array.isArray(driverDetails.vehicle_images)) {
                    driverDetails.vehicle_images = JSON.stringify(driverDetails.vehicle_images);
                }
            },
            afterFind: (result) => {
                if (result) {
                    const records = Array.isArray(result) ? result : [result];
                    records.forEach(record => {
                        if (record && record.vehicle_images && typeof record.vehicle_images === 'string') {
                            try {
                                record.vehicle_images = JSON.parse(record.vehicle_images);
                            } catch (error) {
                                console.error('Error parsing vehicle_images JSON:', error);
                                record.vehicle_images = [];
                            }
                        }
                    });
                }
            },
        },
    }
);

module.exports = DriverDetails;