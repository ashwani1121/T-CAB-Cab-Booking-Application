const { sequelize, Sequelize, User, Wallets, WalletTransactions, UserRole } = require("../../models");
const apiController = require("./apiController");
const { Op }        = require("sequelize");
const crypto        = require("crypto");
const BASE_URL      = process.env.BASE_URL || "http://localhost:5000";
const walletController = {
	
	// Get wallet balance and details
	getWalletBalance: async (req, res) => {
		try{
			if(!req.user || !req.user.userId){
				return res.status(401).json({
					success : false,
					message : "Unauthorized: User not authenticated"
				});
			}
			const userId = req.user.userId;
			if(!userId || !Number.isInteger(userId)){
				return res.status(400).json({
					success : false,
					message : "Valid User ID is required"
				});
			}
			const user = await User.findByPk(userId);
			if(!user){
				return res.status(404).json({
					success: false,
					message: "User not found"
				});
			}
			const wallet = await Wallets.findOne({
				where: { user_id: userId }
			});
			if(!wallet){
				return res.status(404).json({
					success: false,
					message: "Wallet not found"
				});
			}
			// Get recent transactions
			const recentTransactions = await WalletTransactions.findAll({
				where: { wallet_id: wallet.id },
				limit: 10,
				order: [["created_at", "DESC"]],
				attributes: [
					"id",
					"transaction_id",
					"type",
					"amount",
					"description",
					"status",
					"created_at",
					"reference_type"
				],
			});
			const walletData = {
				balance             : parseFloat(wallet.balance),
				reserved_balance    : parseFloat(wallet.reserved_balance),
				total_earned        : parseFloat(wallet.total_earned),
				total_spent         : parseFloat(wallet.total_spent),
				currency            : wallet.currency,
				status              : wallet.status,
				recent_transactions : recentTransactions,
			};
			res.status(200).json({
				success : true,
				message : "Wallet details retrieved successfully",
				data    : walletData,
			});
		}catch(error){
			console.error("Get wallet balance error:", error);
			return res.status(500).json({
				success : false,
				message : "Something went wrong. please try again later.",
			});
		}
	},

	// Get wallet transaction history
	getTransactionHistory: async (req, res) => {
		try{
			if(!req.user || !req.user.userId){
				return res.status(401).json({
					success: false,
					message: "Unauthorized: User not authenticated"
				});
			}
			const userId = req.user.userId;
			if(!userId || !Number.isInteger(userId)){
				return res.status(400).json({
					success: false,
					message: "Valid User ID is required",
				});
			}
			// Check if driver exists and has proper role
			const user = await User.findByPk(userId);
			if(!user){
				return res.status(404).json({
					success: false,
					message: "User not found"
				});
			}
			// Check if user has driver role
			const userRole = await UserRole.findOne({
				where: {
					user_id: userId,
					role_id: 2,
				},
				include: [
				{
					model: Role,
					attributes: ["id", "name"],
				},
				],
			});
			if(!userRole){
				return res.status(403).json({
					success: false,
					message: "User is not authorized"
				});
			}
			const { page = 1, limit = 20, type, status, reference_type } = req.query;
			const offset = (page - 1) * limit;
			// Build where conditions
			const whereConditions = { user_id: userId };
			if(type) whereConditions.type = type;
			if(status) whereConditions.status = status;
			if(reference_type) whereConditions.reference_type = reference_type;
			const { count, rows: transactions } = await WalletTransactions.findAndCountAll({
				where      : whereConditions,
				limit      : parseInt(limit),
				offset     : offset,
				order      : [["created_at", "DESC"]],
				attributes : [
					"id",
					"transaction_id",
					"reference_type",
					"type",
					"amount",
					"balance_before",
					"balance_after",
					"description",
					"status",
					"created_at",
					"processed_at",
				],
			});
			const responseData = {
				transactions : transactions,
				pagination   : {
					current_page  : parseInt(page),
					per_page      : parseInt(limit),
					total_records : count,
					total_pages   : Math.ceil(count / limit),
				},
			};
			res.status(200).json({
				success : true,
				message : "Transaction history retrieved successfully",
				data    : responseData,
			});
		}catch(error){
			console.error("Get transaction history error:", error);
			res.status(500).json({
				success : false,
				message : "Failed to retrieve transaction history",
			});
		}
	},

	// Get transaction details
	getTransactionDetails: async (req, res) => {
		try{
			if(!req.user || !req.user.userId){
				return res.status(401).json({
					success: false,
					message: "Unauthorized: User not authenticated"
				});
			}
			const userId = req.user.userId;
			if(!userId || !Number.isInteger(userId)){
				return res.status(400).json({
					success: false,
					message: "Valid User ID is required"
				});
			}
			// Check if driver exists and has proper role
			const user = await User.findByPk(userId);
			if(!user){
				return res.status(404).json({
					success: false,
					message: "User not found"
				});
			}
			// Check if user has driver role
			const userRole = await UserRole.findOne({
				where: {
					user_id: userId,
					role_id: 2,
				},
				include: [
				{
					model: Role,
					attributes: ["id", "name"],
				},
				],
			});
			if(!userRole){
				return res.status(403).json({
					success : false,
					message : "User is not authorized",
				});
			}
			const { transaction_id } = req.params;
			const transaction = await WalletTransactions.findOne({
				where: {
					transaction_id: transaction_id,
					user_id: userId,
				},
				include: [
				{
					model: Wallets,
					as: "wallet",
					attributes: ["id", "currency"],
				},
				],
			});
			if(!transaction){
				res.status(404).json({
					success: false,
					message: "Transaction not found",
				});
			}
			res.status(200).json({
				success : true,
				message : "Transaction details retrieved successfully",
				data    : transaction,
			});
		}catch(error){
			console.error("Get transaction details error:", error);
			res.status(500).json({
				success: false,
				message: "Failed to retrieve transaction details",
			});
		}
	},
};
module.exports = walletController;
