const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const catComplaint  = sequelize.define(
    'catComplaint',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        category: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Category cannot be empty'
                },
                len: {
                    args: [1, 255],
                    msg: 'Category must be between 1 and 255 characters'
                }
            }
        },
        status: {
            type: DataTypes.TINYINT,
            defaultValue: 1,
            validate: {
                isIn: {
                    args: [[0, 1]],
                    msg: 'Status must be 0 (inactive) or 1 (active)'
                }
            }
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    },
    {
        tableName: 'category_complaints',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
module.exports = catComplaint;