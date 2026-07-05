const Services = require("../models/servicesModel");
const Vehicletypes = require("../models/vehicleTypesModel");
const { Op, Sequelize } = require("sequelize");
const servicesController = {
	// Get all vehicle types
	getVehicleTypes: async (req, res) => {
		try {
		const vehicleTypes = await Vehicletypes.findAll({
			where: { status: 1 },
			attributes: ["id", "name"],
		});
		res.status(200).json({
			success: true,
			data: vehicleTypes,
		});
		} catch (err) {
		console.error("getVehicleTypes error:", err);
		res.status(500).json({
			success: false,
			message: "Failed to fetch vehicle types",
			errors: { server: err.message },
		});
		}
	},

	// Get all services with pagination, search, and filters
	getServices: async (req, res) => {
		try {
		const {
			page = 1,
			limit = 10,
			search = "",
			status = "",
			sort = "name",
			order = "asc",
		} = req.query;
		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);

		// Validate pagination parameters
		if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
			return res.status(400).json({
			success: false,
			message: "Invalid pagination parameters",
			});
		}

		// Validate sort and order
		const validSortFields = ["name", "status", "created_at", "updated_at"];
		const validOrder = ["asc", "desc"];
		const sortField = validSortFields.includes(sort) ? sort : "name";
		const sortOrder = validOrder.includes(order.toLowerCase())
			? order.toUpperCase()
			: "ASC";

		// Build where clause
		const where = {};
		if (search) {
			where.name = { [Op.like]: `%${search}%` };
		}
		if (status === "1" || status === "0") {
			where.status = Number(status);
		}

		// Fetch services with pagination
		const { rows, count } = await Services.findAndCountAll({
			where,
			order: [[sortField, sortOrder]],
			limit: limitNum,
			offset: (pageNum - 1) * limitNum,
		});
		res.status(200).json({
			success: true,
			data: rows,
			total: count,
			page: pageNum,
			limit: limitNum,
		});
		} catch (err) {
		console.error("getServices error:", err);
		res.status(500).json({
			success: false,
			message: "Something went wrong. Please try again later!",
			errors: { server: err.message },
		});
		}
	},

	// Create a Service
	createService: async (req, res) => {
		try {
		const {
			name,
			description,
			polygon_coordinates,
			vehicle_type_ids,
			status,
		} = req.body;

		const errors = {};

		// Name: Required, string, max 255 chars, unique
		if (!name || !name.trim()) {
			errors.name = "Service name is required";
		} else if (name.trim().length > 255) {
			errors.name = "Service name must not exceed 255 characters";
		}
		// Description: Optional, text
		if (description && description.length > 65535) {
			errors.description = "Description is too long";
		}
		// Polygon coordinates: Optional, should be valid JSON
		if (polygon_coordinates) {
			try {
			if (typeof polygon_coordinates === "string") {
				JSON.parse(polygon_coordinates);
			} else if (typeof polygon_coordinates !== "object") {
				errors.polygon_coordinates =
				"Polygon coordinates must be valid JSON";
			}
			} catch (e) {
			errors.polygon_coordinates = "Polygon coordinates must be valid JSON";
			}
		}
		// Vehicle type IDs: Optional, should be valid JSON array
		if (vehicle_type_ids) {
			try {
			let vehicleIds;
			if (typeof vehicle_type_ids === "string") {
				vehicleIds = JSON.parse(vehicle_type_ids);
			} else if (Array.isArray(vehicle_type_ids)) {
				vehicleIds = vehicle_type_ids;
			} else {
				errors.vehicle_type_ids =
				"Vehicle type IDs must be a stringified JSON array or an array";
				return;
			}
			if (!Array.isArray(vehicleIds)) {
				errors.vehicle_type_ids = "Vehicle type IDs must be an array";
			} else if (
				vehicleIds.some((id) => !Number.isInteger(id) || id <= 0)
			) {
				errors.vehicle_type_ids =
				"Vehicle type IDs must be positive integers";
			} else {
				// Validate that all vehicle types exist
				const existingVehicleTypes = await Vehicletypes.findAll({
				where: { id: { [Op.in]: vehicleIds } },
				attributes: ["id"],
				});
				if (existingVehicleTypes.length !== vehicleIds.length) {
				errors.vehicle_type_ids =
					"One or more vehicle types do not exist";
				}
			}
			} catch (e) {
			console.error("Error in vehicle_type_ids validation:", e.message);
			errors.vehicle_type_ids = "Vehicle type IDs must be valid JSON array";
			}
		}
		// Status: Optional, 0 or 1
		if (status !== undefined && ![0, 1].includes(Number(status))) {
			errors.status = "Status must be 0 (inactive) or 1 (active)";
		}
		if (Object.keys(errors).length > 0) {
			return res.status(400).json({
			success: false,
			message: "Validation failed",
			errors,
			});
		}
		// Check for duplicate name
		const existingService = await Services.findOne({
			where: { name: name.trim().toUpperCase() },
		});
		if (existingService) {
			return res.status(400).json({
			success: false,
			message: "Service name already exists",
			errors: { name: "Service name must be unique" },
			});
		}
		const serviceData = {
			name: name.trim().toUpperCase(),
			status: status !== undefined ? Number(status) : 1,
			created_at: new Date(),
			updated_at: new Date(),
		};
		if (description) {
			serviceData.description = description.trim();
		}
		if (polygon_coordinates) {
			serviceData.polygon_coordinates =
			typeof polygon_coordinates === "string"
				? polygon_coordinates
				: JSON.stringify(polygon_coordinates);
		}
		if (vehicle_type_ids) {
			serviceData.vehicle_type_ids =
			typeof vehicle_type_ids === "string"
				? vehicle_type_ids
				: JSON.stringify(vehicle_type_ids);
		}
		const service = await Services.create(serviceData);
		res.status(201).json({
			success: true,
			data: service,
			message: "Service created successfully",
		});
		} catch (err) {
		console.error("createService error:", err);
		res.status(500).json({
			success: false,
			message: "Something went wrong. Please try again later!",
			errors: { server: err.message },
		});
		}
	},

	// Update a Service
	updateService: async (req, res) => {
		try {
		const { id } = req.params;
		const {
			name,
			description,
			polygon_coordinates,
			vehicle_type_ids,
			status,
		} = req.body;

		// Check if service exists
		const service = await Services.findByPk(id);
		if (!service) {
			return res.status(404).json({
			success: false,
			message: "Service not found",
			});
		}

		const errors = {};
		// Name validation
		if (name !== undefined) {
			if (!name || !name.trim()) {
			errors.name = "Service name cannot be empty";
			} else if (name.trim().length > 255) {
			errors.name = "Service name must not exceed 255 characters";
			} else {
			// Check for duplicate name (excluding current service)
			const existingService = await Services.findOne({
				where: {
				name: name.trim().toUpperCase(),
				id: { [Op.ne]: id },
				},
			});
			if (existingService) {
				errors.name = "Service name already exists";
			}
			}
		}
		// Description validation
		if (
			description !== undefined &&
			description &&
			description.length > 65535
		) {
			errors.description = "Description is too long";
		}
		// Polygon coordinates validation
		if (polygon_coordinates !== undefined) {
			if (polygon_coordinates) {
			try {
				if (typeof polygon_coordinates === "string") {
				JSON.parse(polygon_coordinates);
				} else if (typeof polygon_coordinates !== "object") {
				errors.polygon_coordinates =
					"Polygon coordinates must be valid JSON";
				}
			} catch (e) {
				errors.polygon_coordinates =
				"Polygon coordinates must be valid JSON";
			}
			}
		}
		// Vehicle type IDs validation
		if (vehicle_type_ids !== undefined) {
			if (vehicle_type_ids) {
			try {
				let vehicleIds;
				if (typeof vehicle_type_ids === "string") {
				vehicleIds = JSON.parse(vehicle_type_ids);
				} else {
				vehicleIds = vehicle_type_ids;
				}
				// console.log(typeof vehicleIds);
				if (!Array.isArray(vehicleIds)) {
				errors.vehicle_type_ids = "Vehicle type IDs must be an array";
				} else if (
				vehicleIds.some((id) => !Number.isInteger(id) || id <= 0)
				) {
				errors.vehicle_type_ids =
					"Vehicle type IDs must be positive integers";
				} else {
				// Validate that all vehicle types exist
				const existingVehicleTypes = await Vehicletypes.findAll({
					where: { id: { [Op.in]: vehicleIds } },
					attributes: ["id"],
				});
				if (existingVehicleTypes.length !== vehicleIds.length) {
					errors.vehicle_type_ids =
					"One or more vehicle types do not exist";
				}
				}
			} catch (e) {
				errors.vehicle_type_ids =
				"Vehicle type IDs must be valid JSON array";
			}
			}
		}

		// Status validation
		if (status !== undefined && ![0, 1].includes(Number(status))) {
			errors.status = "Status must be 0 (inactive) or 1 (active)";
		}
		if (Object.keys(errors).length > 0) {
			return res.status(400).json({
			success: false,
			message: "Validation failed",
			errors,
			});
		}
		const updateData = {
			updated_at: new Date(),
		};
		if (name !== undefined) {
			updateData.name = name.trim().toUpperCase();
		}
		if (description !== undefined) {
			updateData.description = description ? description.trim() : null;
		}
		if (polygon_coordinates !== undefined) {
			updateData.polygon_coordinates = polygon_coordinates
			? typeof polygon_coordinates === "string"
				? polygon_coordinates
				: JSON.stringify(polygon_coordinates)
			: null;
		}
		if (vehicle_type_ids !== undefined) {
			updateData.vehicle_type_ids = vehicle_type_ids
			? typeof vehicle_type_ids === "string"
				? vehicle_type_ids
				: JSON.stringify(vehicle_type_ids)
			: null;
		}
		if (status !== undefined) {
			updateData.status = Number(status);
		}
		await service.update(updateData);
		const updatedService = await Services.findByPk(id);
		res.status(200).json({
			success: true,
			data: updatedService,
			message: "Service updated successfully",
		});
		} catch (err) {
		console.error("updateService error:", err);
		res.status(500).json({
			success: false,
			message: "Something went wrong. Please try again later!",
			errors: { server: err.message },
		});
		}
	},

	// Delete a Service (soft delete)
	deleteService: async (req, res) => {
		try {
		const { id } = req.params;
		const service = await Services.findByPk(id);
		if (!service) {
			return res.status(404).json({
			success: false,
			message: "Service not found",
			});
		}
		await service.update({
			status: 0,
			updated_at: new Date(),
		});
		res.status(200).json({
			success: true,
			message: "Service deleted successfully",
		});
		} catch (err) {
		console.error("deleteService error:", err);
		res.status(500).json({
			success: false,
			message: "Failed to delete service",
			errors: { server: err.message },
		});
		}
	},

	// Get single service by ID
	getServiceById: async (req, res) => {
		try {
		const { id } = req.params;
		const service = await Services.findByPk(id);
		if (!service) {
			return res.status(404).json({
			success: false,
			message: "Service not found",
			});
		}
		res.status(200).json({
			success: true,
			data: service,
		});
		} catch (err) {
		console.error("getServiceById error:", err);
		res.status(500).json({
			success: false,
			message: "Failed to fetch service",
			errors: { server: err.message },
		});
		}
	},
};
module.exports = servicesController;
