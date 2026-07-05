const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Feedback = sequelize.define(
    'Feedback', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        feedback: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        status: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        }
}, {
    tableName: 'feedback',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
module.exports = Feedback;