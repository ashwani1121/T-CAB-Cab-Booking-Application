const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Notification  = sequelize.define('Notification', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING(50),
        defaultValue: 'general'
    },
    data: {
        type: DataTypes.JSON,
        allowNull: true
    },
    read_status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            name: 'idx_user_id',
            fields: ['user_id']
        },
        {
            name: 'idx_read_status',
            fields: ['read_status']
        },
        {
            name: 'idx_created_at',
            fields: ['created_at']
        },
        {
            name: 'idx_type',
            fields: ['type']
        },
        {
            name: 'idx_user_unread',
            fields: ['user_id', 'read_status']
        },
        {
            name: 'idx_user_created',
            fields: ['user_id', { attribute: 'created_at', order: 'DESC' }]
        }
    ]
});
module.exports = Notification;
