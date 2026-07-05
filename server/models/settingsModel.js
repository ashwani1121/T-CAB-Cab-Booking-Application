const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Settings 		= sequelize.define(
  "Settings",
  {
    role: {
		type: DataTypes.ENUM("user", "driver", "admin"),
		allowNull: false,
		unique: true
    },
    company_name: {
		type: DataTypes.STRING(255),
		allowNull: true,
    },
    logo: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "logo"
    },
    company_email: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "company_email"
    },
    company_phone: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "company_phone"
    },
    company_address: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "company_address"
    },
    privacy_policy: {
		type: DataTypes.TEXT("long"),
		allowNull: true,
		field: "privacy_policy"
    },
    consent_form: {
		type: DataTypes.TEXT("long"),
		allowNull: true,
		field: "consent_form"
    },
    fare_charges_policy: {
		type: DataTypes.TEXT("long"),
		allowNull: true,
		field: "fare_charges_policy",
		comment: "Fare and charges policies for driver"
    },
    reservation_policy: {
		type: DataTypes.TEXT("long"),
		allowNull: true,
		field: "reservation_policy",
		comment: "Reservation policies for admin"
    },
    gradient_direction: {
		type: DataTypes.STRING,
		allowNull: false,
		defaultValue: "to right",
		field: "gradient_direction"
    },
    primary_gradient_start: {
		type: DataTypes.STRING,
		allowNull: false,
		field: "primary_gradient_start"
    },
    primary_gradient_end: {
		type: DataTypes.STRING,
		allowNull: false,
		field: "primary_gradient_end"
    },
    secondary_gradient_start: {
		type: DataTypes.STRING,
		allowNull: false,
		field: "secondary_gradient_start"
    },
    secondary_gradient_end: {
		type: DataTypes.STRING,
		allowNull: false,
		field: "secondary_gradient_end"
    },
    sidebar_gradient_start: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "sidebar_gradient_start"
    },
    sidebar_gradient_end: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "sidebar_gradient_end"
    },
    commission_type: {
		type: DataTypes.ENUM("percentage", "fixed"),
		allowNull: false,
		defaultValue: "percentage",
		field: "commission_type",
		comment: 'Type of commission calculation'
    },
    book_any_vehicle: {
		type: DataTypes.STRING,
		allowNull: false,
		defaultValue: "show",
		field: "book_any_vehicle"
    },
    max_cancellations_per_day: {
		type: DataTypes.INTEGER,
		allowNull: false,
		defaultValue: 3,
		field: "max_cancellations_per_day",
		comment: 'Maximum number of free cancellations allowed per driver per day'
    },
    max_cancellation_amt: {
		type: DataTypes.DECIMAL(8, 2),
		allowNull: false,
		defaultValue: 0.00,
		field: "max_cancellation_amt",
		comment: 'Maximum cancellation amount'
    },
    cancellation_charge_percent: {
		type: DataTypes.DECIMAL(5, 2),
		allowNull: false,
		defaultValue: 0.00,
		field: "cancellation_charge_percent",
		comment: 'Percentage of ride amount to deduct from driver deposit after exceeding cancellation limit'
    },
    wallet_negative_limit: {
		type: DataTypes.DECIMAL(10, 2),
		allowNull: true,
		defaultValue: 0.00,
		field: "wallet_negative_limit",
		comment: 'Maximum negative balance allowed for wallet (admin only)'
    },
    transfer_time_from: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "transfer_time_from",
		comment: 'Start time for allowed transfers (admin only)'
    },
    transfer_time_to: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "transfer_time_to",
		comment: 'End time for allowed transfers (admin only)'
    },
    complain_assignable_roles: DataTypes.STRING(255),
    complain_escalation_roles: DataTypes.STRING(255),
    ranking_image: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "ranking_image",
		comment: 'Image for ranking screen/section'
    },
    leaderboard_image: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "leaderboard_image",
		comment: 'Image for leaderboard screen/section'
    },
    onboard_title_one: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "onboard_title_one"
    },
    onboard_desc_one: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: "onboard_desc_one"
    },
    onboard_img_one: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "onboard_img_one"
    },
    onboard_title_two: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "onboard_title_two"
    },
    onboard_desc_two: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: "onboard_desc_two"
    },
    onboard_img_two: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "onboard_img_two"
    },
    hero_title: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "hero_title"
    },
    hero_image: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "hero_image"
    },
    hero_is_text_enabled: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: true,
		field: "hero_is_text_enabled"
    },
    ad1_images: {
		type: DataTypes.JSON,
		allowNull: true,
		field: "ad1_images",
		defaultValue: []
    },
    ad1_images_metadata: {
		type: DataTypes.JSON,
		allowNull: true,
		field: "ad1_images_metadata",
		defaultValue: []
    },
    ad1_button_text: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "ad1_button_text"
    },
    ad1_link: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "ad1_link"
    },
    ad1_image_title: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "ad1_image_title"
    },
    ad1_is_image_title_enabled: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: true,
		field: "ad1_is_image_title_enabled"
    },
    ad1_is_button_enabled: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: true,
		field: "ad1_is_button_enabled"
    },
    ad2_images: {
		type: DataTypes.JSON,
		allowNull: true,
		field: "ad2_images",
		defaultValue: []
    },
    ad2_images_metadata: {
		type: DataTypes.JSON,
		allowNull: true,
		field: "ad2_images_metadata",
		defaultValue: []
    },
    ad2_button_text: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "ad2_button_text"
    },
    ad2_link: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "ad2_link"
    },
    ad2_image_title: {
		type: DataTypes.STRING,
		allowNull: true,
		field: "ad2_image_title"
    },
    ad2_is_image_title_enabled: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: true,
		field: "ad2_is_image_title_enabled"
    },
    ad2_is_button_enabled: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: true,
		field: "ad2_is_button_enabled"
    },
	subscription_activate: {
		type: DataTypes.ENUM("yes", "no"),
		allowNull: false,
		defaultValue: "no",
		field: "subscription_activate",
		comment: 'Enable or disable subscription features in the app'
	},
	otp_provider: {
		type: DataTypes.ENUM("msg91", "combirds"),
		allowNull: false,
		defaultValue: "msg91", 
		field: "otp_provider",
		comment: "Selected OTP service provider"
	},
    created_at: {
		type: DataTypes.DATE,
		allowNull: false,
		defaultValue: DataTypes.NOW,
		field: "created_at"
    },
	updated_at: {
		type: DataTypes.DATE,
		allowNull: false,
		defaultValue: DataTypes.NOW,
		field: "updated_at"
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "settings",
  }
);

module.exports = Settings;