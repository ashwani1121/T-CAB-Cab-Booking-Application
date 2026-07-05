const { DataTypes } 	 		= require("sequelize");
const { sequelize } 	 		= require("../config/db");
const WalletTransactions 		= sequelize.define(
	"WalletTransactions",
	{
		id				 		: {
			type		 		: DataTypes.BIGINT,
			primaryKey			: true,
			autoIncrement		: true,
			allowNull			: false
		},
		wallet_id				: {
			type				: DataTypes.BIGINT,
			allowNull			: false,
			references			: {
				model			: "wallets",
				key				: "id",
			},
			onDelete			: "CASCADE"
		},
		user_id					: {
			type				: DataTypes.BIGINT,
			allowNull			: false,
			references			: {
				model			: "users",
				key				: "id",
			},
			onDelete			: "CASCADE"
		},
		transaction_id			: {
			type				: DataTypes.STRING(100),
			allowNull			: false,
			unique				: true
		},
		reference_type			: {
			type				: DataTypes.ENUM(
				"ride_payment",
				"ride_refund",
				"topup",		
				"withdrawal",
				"bonus",
				"referral_bonus",
				"cashback",
				"penalty",
				"adjustment",
				"driver_earning",
				"driver_commission"
			),
			allowNull			: false
		},
		reference_id			: {
			type				: DataTypes.BIGINT,
			allowNull			: true,
			comment				: "Related entity ID (ride_id, promo_id, etc.)"
		},
		type					: {
			type				: DataTypes.ENUM("credit", "debit"),
			allowNull			: false
		},
		amount					: {
			type				: DataTypes.DECIMAL(10, 2),
			allowNull			: false
		},
		balance_before			: {
			type				: DataTypes.DECIMAL(10, 2),
			allowNull			: false
		},
		balance_after			: {
			type				: DataTypes.DECIMAL(10, 2),
			allowNull			: false
		},
		description				: {
			type				: DataTypes.STRING(255),
			allowNull			: false
		},
		payment_method			: {
			type				: DataTypes.ENUM("easebuzz", "cash", "bank_transfer", "adjustment"),
			allowNull			: true
		},
		payment_gateway			: {
			type				: DataTypes.STRING(50),
			allowNull			: true,
			defaultValue		: "easebuzz"
		},
		gateway_transaction_id	: {
			type				: DataTypes.STRING(100),
			allowNull			: true
		},
		gateway_payment_id		: {
			type				: DataTypes.STRING(100),
			allowNull			: true,
		},
		gateway_order_id		: {
			type				: DataTypes.STRING(100),
			allowNull			: true
		},
		status					: {
			type				: DataTypes.ENUM(
				"pending",
				"completed",
				"failed",
				"cancelled",
				"refunded"
			),
			allowNull			: false,
			defaultValue		: "pending"
		},
		processed_at			: {
			type				: DataTypes.DATE,
			allowNull			: true
		},
		failed_at				: {
			type				: DataTypes.DATE,
			allowNull			: true,
		},
		failure_reason			: {
			type				: DataTypes.STRING(255),
			allowNull			: true
		},
		metadata				: {
			type				: DataTypes.JSON,
			allowNull			: true,
			comment				: "Additional transaction details"
		},
	},
	{
		tableName				: "wallet_transactions",
		timestamps				: true,
		createdAt				: "created_at",
		updatedAt				: "updated_at",
		indexes					: [
		{
			unique				: true,
			fields				: ["transaction_id"],
			name				: "uk_transaction_id",
		},
		{
			fields				: ["wallet_id"],
			name				: "idx_wallet_id",
		},
		{
			fields				: ["user_id"],
			name				: "idx_user_id",
		},
		{
			fields				: ["reference_type", "reference_id"],
			name				: "idx_reference",
		},
		{
			fields				: ["type", "status"],
			name				: "idx_type_status",
		},
		{
			fields				: ["gateway_payment_id"],
			name				: "idx_gateway_payment_id",
		},
		{
			fields				: ["gateway_order_id"],
			name				: "idx_gateway_order_id",
		},
		{
			fields				: ["created_at"],
			name				: "idx_created_at",
		},
		{
			fields				: ["status", "processed_at"],
			name				: "idx_status_processed",
		},
		{
			fields				: ["created_at", "type"],
			name				: "idx_transaction_date_type",
		},
		{
			fields				: ["payment_gateway", "status"],
			name				: "idx_transaction_gateway",
		},
		],
	}
);
module.exports = WalletTransactions;
