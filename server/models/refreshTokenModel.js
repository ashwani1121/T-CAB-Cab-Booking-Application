const { DataTypes } = require('sequelize');
const sequelize     = require('../config/db').sequelize;
const RefreshToken  = sequelize.define('RefreshToken', {
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'refresh_tokens',
    timestamps: true,
    underscored: true,
});
module.exports = RefreshToken;