const { Settings, Trips } = require("../../models");
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const settingsController = {

	// Fetch settings
	getAppSettings: async (req, res) => {
		try{
			const { role } = req.params;
			if(!["user", "driver"].includes(role)){
				return res.status(400).json({
					success: false,
					message: 'Invalid role specified. Must be "user" or "driver".'
				});
			}
			const settings = await Settings.findOne({
				where: { role },
				attributes: [
					"company_name",
					"logo",
					"company_email",
					"company_phone",
					"company_address",
					"privacy_policy",
					"consent_form",
					"primary_gradient_start",
					"primary_gradient_end",
					"secondary_gradient_start",
					"secondary_gradient_end",
					"gradient_direction",
					"onboard_title_one",
					"onboard_desc_one",
					"onboard_img_one",
					"onboard_title_two",
					"onboard_desc_two",
					"onboard_img_two",
					"otp_provider"
				],
			});
			if(!settings){
				return res.status(404).json({
					success : false,
					message : "No settings found"
				});
			}
			const responseData = {
				company        : {
					name       : settings.company_name,
					logo       : settings.logo ? `${BASE_URL}/Uploads/settings/${settings.logo}` : null,
					email      : settings.company_email,
					phone      : settings.company_phone,
					address    : settings.company_address,
				},
				theme          : {
					primary    : {
						start  : settings.primary_gradient_start,
						end    : settings.primary_gradient_end,
					},
					secondary  : {
						start  : settings.secondary_gradient_start,
						end    : settings.secondary_gradient_end,
					},
					direction  : settings.gradient_direction,
				},
				onboarding     : [],
				privacy_policy : settings.privacy_policy,
				consent_form   : settings.consent_form,
				otp_provider   : settings.otp_provider
			};
			if(settings.onboard_img_one){
				responseData.onboarding.push({
					id         : 1,
					title      : settings.onboard_title_one,
					description: settings.onboard_desc_one,
					image      : `${BASE_URL}/Uploads/settings/${settings.onboard_img_one}`
				});
			}
			if(settings.onboard_img_two){
				responseData.onboarding.push({
					id         : 2,
					title      : settings.onboard_title_two,
					description: settings.onboard_desc_two,
					image      : `${BASE_URL}/Uploads/settings/${settings.onboard_img_two}`
				});
			}
			res.status(200).json({
				success : true,
				message : "Settings retrieved successfully.",
				data    : responseData,
			});
		}catch(err){
			res.status(500).json({
				success: false,
				message: "Something went wrong. please try again later!",
			});
		}
	},

	// Fetch trips and promotions
	getTrips: async (req, res) => {
		try{
			const trips = await Trips.findAll({
				attributes: ["id", "trip", "image", "created_at", "updated_at","status"],
			});
			const settings = await Settings.findOne({
				where: { role: "user" },
				attributes: [
					"hero_title",
					"hero_image",
					"hero_is_text_enabled",
					"ad1_images",
					"ad1_button_text",
					"ad1_link",
					"ad1_image_title",
					"ad1_is_image_title_enabled",
					"ad1_is_button_enabled",
					"ad1_images_metadata",
					"ad2_images",
					"ad2_button_text",
					"ad2_link",
					"ad2_image_title",
					"ad2_is_image_title_enabled",
					"ad2_is_button_enabled",
					"ad2_images_metadata"
				],
			});
			if(!settings){
				return res.status(404).json({
					success: false,
					message: "No settings found"
				});
			}
			const formattedTrips = trips.map((trip) => ({
				id        : trip.id,
				trip      : trip.trip,
				image     : trip.image ? `${BASE_URL}/uploads/trips/${trip.image}` : null,
				createdAt : trip.created_at,
				updatedAt : trip.updated_at,
				status    : trip.status,
			}));
			let ad1Images             = [];
			let ad2Images             = [];
			let ad1ImagesMetadata     = [];
			let ad2ImagesMetadata     = [];
			if(settings){
				try{
					ad1Images         = typeof settings.ad1_images === "string" ? JSON.parse(settings.ad1_images) : settings.ad1_images;
					ad2Images         = typeof settings.ad2_images === "string" ? JSON.parse(settings.ad2_images) : settings.ad2_images;
					ad1ImagesMetadata = typeof settings.ad1_images_metadata === "string" ? JSON.parse(settings.ad1_images_metadata) : settings.ad1_images_metadata;
					ad2ImagesMetadata = typeof settings.ad2_images_metadata === "string" ? JSON.parse(settings.ad2_images_metadata) : settings.ad2_images_metadata;
				}catch(err){
					console.error("Error parsing promotion images/metadata:", err);
					ad1Images         = [];
					ad2Images         = [];
					ad1ImagesMetadata = [];
					ad2ImagesMetadata = [];
				}
			}
			ad1Images           = Array.isArray(ad1Images) ? ad1Images : [];
			ad2Images           = Array.isArray(ad2Images) ? ad2Images : [];
			ad1ImagesMetadata   = Array.isArray(ad1ImagesMetadata) ? ad1ImagesMetadata : [];
			ad2ImagesMetadata   = Array.isArray(ad2ImagesMetadata) ? ad2ImagesMetadata : [];
			const promotionData = settings
			? {
				banner: settings.hero_image
				? {
					image: settings.hero_image
						? `${BASE_URL}/uploads/trips/${settings.hero_image}`
						: null,
					imageTitle: settings.hero_title || "",
					isImageTitleEnabled: settings.hero_is_text_enabled ?? true,
					}
				: null,
				ads: [
				{
					images: ad1Images.map((img) => ({
					url: `${BASE_URL}/uploads/trips/${img}`,
					metadata: ad1ImagesMetadata.find(
						(meta) => meta.name === img
					) || { name: img, size: 0 },
					})),
					buttonText: settings.ad1_button_text || "",
					buttonLink: settings.ad1_link || "",
					isButtonEnabled: settings.ad1_is_button_enabled ?? true,
					imageTitle: settings.ad1_image_title || "",
					isImageTitleEnabled:
					settings.ad1_is_image_title_enabled ?? true,
				},
				{
					images: ad2Images.map((img) => ({
					url: `${BASE_URL}/uploads/trips/${img}`,
					metadata: ad2ImagesMetadata.find(
						(meta) => meta.name === img
					) || { name: img, size: 0 },
					})),
					buttonText: settings.ad2_button_text || "",
					buttonLink: settings.ad2_link || "",
					isButtonEnabled: settings.ad2_is_button_enabled ?? true,
					imageTitle: settings.ad2_image_title || "",
					isImageTitleEnabled:
					settings.ad2_is_image_title_enabled ?? true,
				},
				],
			}
			: {
				banner: null,
				ads: [
				{
					images: [],
					buttonText: "",
					buttonLink: "",
					isButtonEnabled: true,
					imageTitle: "",
					isImageTitleEnabled: true,
				},
				{
					images: [],
					buttonText: "",
					buttonLink: "",
					isButtonEnabled: true,
					imageTitle: "",
					isImageTitleEnabled: true,
				},
				],
			};
			res.status(200).json({
				success        : true,
				data           : {
					trips      : formattedTrips,
					promotions : promotionData
				},
			});
		}catch(err){
			console.error("getTrips error:", err);
			res.status(500).json({
				success: false,
				message: "Something went wrong. Please try again later!",
			});
		}
	}

};
module.exports = settingsController;
