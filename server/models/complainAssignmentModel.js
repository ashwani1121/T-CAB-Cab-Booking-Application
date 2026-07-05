const { DataTypes }       = require('sequelize');
const { sequelize }       = require('../config/db');
const ComplaintAssignment = sequelize.define(
    'ComplaintAssignment',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        complaint_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'complaints',
                key: 'id'
            },
            comment: 'The complaint being assigned'
        },
        assigned_to: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Team member assigned to the complaint'
        },
        assigned_by: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Admin who made the assignment'
        },
        assigned_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'When the assignment was made'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Optional notes about the assignment'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this assignment is currently active'
        }
    },
    {
        tableName: 'complaint_assignments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['complaint_id'] },
            { fields: ['assigned_to'] },
            { fields: ['assigned_by'] },
            { fields: ['is_active'] },
            { fields: ['assigned_at'] }
        ]
    }
);
module.exports = ComplaintAssignment;