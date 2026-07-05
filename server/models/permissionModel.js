const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Permission    = sequelize.define(
    'Permission', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'roles',
                key: 'id'
            }
        },
        module: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        can_add: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        can_edit: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        can_delete: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        can_view: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        status: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false
        }
    }, {
        tableName: 'permissions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
module.exports = Permission;