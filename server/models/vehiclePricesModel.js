const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Vehicleprices = sequelize.define(
    'Vehicleprices', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
            comment: 'Foreign key referencing vehicle_types(id)',
            references: {
                model: 'vehicle_types',
                key: 'id',
            },
        },
        trip_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Foreign key referencing trips(id)',
            references: {
                model: 'trips',
                key: 'id',
            },
        },
        // Intercity pricing fields
        intercity_minimum_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Base Minimum for Intercity'
        },
        intercity_base_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Base Price for Intercity'
        },
        intercity_per_km_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Charge per KM for Intercity'
        },
        intercity_waiting_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Waiting Time charge for Intercity'
        },
        intercity_bata_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Bata Charges for Intercity'
        },
        // Outstation pricing fields
        outstation_minimum_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Minimum Price for Outstation'
        },
        outstation_base_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Base Price for Outstation'
        },
        outstation_per_km_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Charge per KM for Outstation'
        },
        outstation_waiting_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Waiting Time charge for Outstation'
        },
        outstation_bata_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Bata Charges for Outstation'
        },
        // Round Trip Intercity pricing fields
        round_intercity_minimum_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Minimum Price for Round Trip Intercity'
        },
        round_intercity_base_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Base Price for Round Trip Intercity'
        },
        round_intercity_per_km_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Charge per KM for Round Trip Intercity'
        },
        round_intercity_waiting_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Waiting Time for Round Trip Intercity'
        },
        round_intercity_bata_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Bata Charges for Intercity'
        },
        // Round Trip Outstation pricing fields
        round_outstation_minimum_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Minimum Price for Round Trip Outstation'
        },
        round_outstation_base_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Base Price for Round Trip Outstation'
        },
        round_outstation_per_km_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Charge per KM for Round Trip Outstation'
        },
        round_outstation_waiting_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Waiting Time for Round Trip Outstation'
        },
        round_intercity_bata_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Bata Charges for Intercity'
        },
        // Reservation pricing fields
        reservation_base_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Base Price for Reservation'
        },
        reservation_per_km_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Charge per KM for Reservation'
        },
        max_km: {
            type: DataTypes.INTEGER,
            allowNull: true,  
            comment: 'Maximum km limit (not applicable for reserve trips)'
        },
        outstation_km: {
            type: DataTypes.INTEGER,
            allowNull: true,  
            comment: 'Outstation km threshold (not applicable for reserve trips)'
        },
        package_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Foreign key referencing packages(id)',
            references: {
                model: 'packages',
                key: 'id',
            },
        },
        // BATA timing configuration
        bata_time_start: {
            type: DataTypes.TIME,
            allowNull: true,
            defaultValue: '21:00:00',
            comment: 'Bata Time Starts (9 PM)'
        },
        bata_time_end: {
            type: DataTypes.TIME,
            allowNull: true,
            defaultValue: '05:00:00',
            comment: 'Bata Time Ends (5 AM)'
        },
        // Pricing metadata
        updated_pricing_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Last pricing update timestamp'
        },
        // State reference for tax calculations
        state_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Foreign key referencing states(id)',
            references: {
                model: 'states',
                key: 'id',
            },
        },
        // Tax rates
        igst_rate: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 5.00,
            comment: 'IGST rate percentage (e.g., 5.00 for 5%)'
        },
        cgst_rate: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 2.50,
            comment: 'CGST rate percentage (e.g., 2.50 for 2.5%)'
        },
        sgst_rate: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 2.50,
            comment: 'SGST rate percentage (e.g., 2.50 for 2.5%)'
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
    },
    {
        tableName: 'vehicle_prices',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['vehicle_type_id', 'trip_id', 'state_id'],
                name: 'unique_vehicle_trip_state'
            },
            {
                fields: ['status', 'updated_pricing_at'],
                name: 'idx_status_pricing'
            }
        ]
    }
);
module.exports = Vehicleprices;