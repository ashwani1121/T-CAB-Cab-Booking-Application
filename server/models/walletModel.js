const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Wallets 		= sequelize.define(
	"Wallets",
	{
		id					: {
			type			: DataTypes.BIGINT,
			primaryKey		: true,
			autoIncrement	: true,
			allowNull		: false
		},
		user_id				: {
			type			: DataTypes.BIGINT,
			allowNull		: false,
			unique			: true,
			references		: {
				model		: "users",
				key			: "id",
			},
			onDelete		: "CASCADE"
		},
		balance				: {
			type			: DataTypes.DECIMAL(10, 2),
			allowNull		: false,
			defaultValue	: 0.0
		},
		reserved_balance	: {
			type			: DataTypes.DECIMAL(10, 2),
			allowNull		: false,
			defaultValue	: 0.0
		},
		total_earned		: {
			type			: DataTypes.DECIMAL(10, 2),
			allowNull		: false,
			defaultValue	: 0.0
		},
		total_spent			: {
			type			: DataTypes.DECIMAL(10, 2),
			allowNull		: false,
			defaultValue	: 0.0
		},
		currency			: {
			type			: DataTypes.STRING(3),
			allowNull		: false,
			defaultValue	: "INR"
		},
		status				: {
			type			: DataTypes.ENUM("active", "inactive", "frozen"),
			allowNull		: false,
			defaultValue	: "active"
		},
	},
	{
		tableName			: "wallets",
		timestamps			: true,
		createdAt			: "created_at",
		updatedAt			: "updated_at",
		indexes				: [
		{
			unique			: true,
			fields			: ["user_id"],
			name			: "uk_user_id",
		},
		{
			fields			: ["balance"],
			name			: "idx_balance",
		},
		{
			fields			: ["status"],
			name			: "idx_status",
		},
		{
			fields			: ["user_id", "status"],
			name			: "idx_wallet_user_status",
		},
		],
	}
);
module.exports = Wallets;
