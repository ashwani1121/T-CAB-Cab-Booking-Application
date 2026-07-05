const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Package = sequelize.define('Package', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: {
            msg: 'Package name must be unique'
        },
        validate: {
            notEmpty: {
                msg: 'Package name is required'
            },
            len: {
                args: [1, 100],
                msg: 'Package name must not exceed 100 characters'
            }
        }
    },
    km: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: {
                msg: 'Distance must be an integer'
            },
            min: {
                args: [1],
                msg: 'Distance must be at least 1 km'
            }
        }
    },
    advance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: {
                msg: 'Advance payment percentage must be an integer'
            },
            min: {
                args: [1],
                msg: 'Advance payment percentage must be at least 1'
            },
            max: {
                args: [100],
                msg: 'Advance payment percentage cannot exceed 100'
            }
        }
    },
    status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        validate: {
            isIn: {
                args: [[0, 1]],
                msg: 'Status must be 0 (inactive) or 1 (active)'
            }
        }
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
    tableName: 'packages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['name']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = Package;