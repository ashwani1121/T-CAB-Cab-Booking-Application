import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Plus, Edit, Trash2, Users } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import { AgGridReact } from "ag-grid-react"

function VehicleTypes() {
	const { theme } = useTheme()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [variants, setVariants] = useState([])
	const [vehicles, setVehicles] = useState([])
	const [tripTypes, setTripTypes] = useState([])
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [vehicleFilter, setVehicleFilter] = useState("")
	const [sortField, setSortField] = useState("name")
	const [sortDirection, setSortDirection] = useState("asc")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [editingVariant, setEditingVariant] = useState(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})
	const [commissionType, setCommissionType] = useState("percentage")
	const [variantFormData, setVariantFormData] = useState({
		name: "",
		vehicleImage: null,
		mapImage: null,
		animationFile: null,
		description: "",
		vehicle_id: "",
		capacity: "1",
		commission: "",
		status: "1"
	})
	const [variantImagePreview, setVariantImagePreview] = useState(null)
	const [variantImageRemoved, setVariantImageRemoved] = useState(false)
	const [variantMapImagePreview, setVariantMapImagePreview] = useState(null)
	const [variantMapImageRemoved, setVariantMapImageRemoved] = useState(false)
	const [variantAnimationPreview, setVariantAnimationPreview] = useState(null)
	const [variantAnimationRemoved, setVariantAnimationRemoved] = useState(false)
	const [placeholder, setPlaceholder] = useState("Search by name...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["name", "variant"]

	// Initialize permissions with safe defaults
	const [vehicleTypesPermissions, setVehicleTypesPermissions] = useState({
		can_add: false,
		can_edit: false,
		can_delete: false,
		can_view: false
	})

	// Get commission label based on type
	const commissionLabel = useMemo(() => {
		return commissionType === "percentage" ? "Commission (%)" : "Commission (Fixed Amount)"
	}, [commissionType])

	// Get commission placeholder based on type
	const commissionPlaceholder = useMemo(() => {
		return commissionType === "percentage" ? "e.g. 15.00 (for 15%)" : "e.g. 50.00 (fixed amount)"
	}, [commissionType])

	console.log(commissionType);

	// Get user permissions for the vehicles module 
	const getUserPermissions = useCallback(() => {
		try {
			const permissionsStr = localStorage.getItem('userPermissions')
			if (permissionsStr) {
				const permissions = JSON.parse(permissionsStr)
				if (permissions.vehicletypes) {
					return {
						can_add: permissions.vehicletypes.can_add || false,
						can_edit: permissions.vehicletypes.can_edit || false,
						can_delete: permissions.vehicletypes.can_delete || false,
						can_view: permissions.vehicletypes.can_view || false
					}
				}
			}
			return {
				can_add: false,
				can_edit: false,
				can_delete: false,
				can_view: false
			}
		} catch (error) {
			console.error('Error parsing user permissions:', error)
			return {
				can_add: false,
				can_edit: false,
				can_delete: false,
				can_view: false
			}
		}
	}, [])

	// Load permissions on mount
	useEffect(() => {
		const permissions = getUserPermissions()
		setVehicleTypesPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setVehicleTypesPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Fetch settings to get commission type
	const fetchSettings = useCallback(async () => {
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/settings`, {
				params: { role: "admin" },
			})
			if (response.data.success && response.data.data) {
				const settings = response.data.data;
				if (settings.commission_type) {
					setCommissionType(settings.commission_type);
				}
			}
		} catch (err) {
			console.error("Error fetching settings:", err)
			// Keep default commission type if fetch fails
		}
	}, [])

	// Fetch vehicles for dropdown
	const fetchVehicles = useCallback(async () => {
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicles`)
			if (response.data.success) {
				setVehicles(response.data.data || [])
			}
		} catch (err) {
			console.error("Error fetching vehicles:", err)
		}
	}, [])

	// Memoized fetch function for variants
	const fetchVariants = useCallback(async (page, limit, search, status, vehicle, sort, order) => {
		setIsLoading(true);
		try {
			const token = localStorage.getItem('token');

			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicle-types`, {
				params: {
					page: page,
					limit: limit,
					search: search || "",
					status: (status === "all" || !status) ? "" : status,
					vehicle: (vehicle === "all" || !vehicle) ? "" : vehicle,
					sort: sort || "name",
					order: order || "asc",
					_t: new Date().getTime()
				},
				headers: {
					Authorization: `Bearer ${token}`,
					"Accept": "application/json",
					"Cache-Control": "no-cache, no-store, must-revalidate",
					"Pragma": "no-cache",
					"Expires": "0"
				}
			});

			if (response.status === 200) {
				if (response.data.success) {
					setVariants(response.data.data || []);
					setTotalRows(response.data.total || 0);
					setTripTypes(response.data.trips || []);
					setVehicles(response.data.vehicles || []);
				} else {
					toast.error(response.data.message || "Failed to fetch vehicle types");
				}
			}
		} catch (err) {
			console.error("Network Error Details:", err.response);
			if (err.response?.status === 401) {
				toast.error("Session expired. Please login again.");
			} else {
				toast.error(err.response?.data?.message || "Failed to fetch vehicle types");
			}
			setVariants([]);
			setTotalRows(0);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Fetch settings on mount
	useEffect(() => {
		fetchSettings()
	}, [fetchSettings])

	// Fetch vehicles on mount
	useEffect(() => {
		fetchVehicles()
	}, [fetchVehicles])

	// Fetch variants on mount and when pagination/search/filter changes
	useEffect(() => {
		fetchVariants(currentPage, perPage, searchQuery, statusFilter, vehicleFilter, sortField, sortDirection)
	}, [currentPage, perPage, searchQuery, statusFilter, vehicleFilter, sortField, sortDirection, fetchVariants])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime = 1500
		const timeout = setTimeout(() => {
			const currentWord = words[currentWordIndex]
			if (!isDeleting && currentCharIndex < currentWord.length) {
				setPlaceholder(
					`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`
				)
				setCurrentCharIndex((prev) => prev + 1)
			} else
				if (isDeleting && currentCharIndex > 0) {
					setPlaceholder(
						`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`
					)
					setCurrentCharIndex((prev) => prev - 1)
				} else
					if (!isDeleting && currentCharIndex === currentWord.length) {
						setTimeout(() => setIsDeleting(true), pauseTime)
					} else
						if (isDeleting && currentCharIndex === 0) {
							setIsDeleting(false)
							setCurrentWordIndex((prev) => (prev + 1) % words.length)
						}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting, words])

	// Handle search change
	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	// Handle page change
	const handlePageChange = (newPage) => {
		setCurrentPage(newPage)
	}

	// Handle variant input change
	const handleVariantInputChange = (e) => {
		const { name, value } = e.target
		setVariantFormData((prev) => ({ ...prev, [name]: value }))
		if (backendErrors[name]) {
			setBackendErrors((prev) => ({ ...prev, [name]: "" }))
		}
	}

	const handleVariantImageChange = (e) => {
		const file = e.target.files[0]
		if (file) {
			setVariantFormData((prev) => ({ ...prev, vehicleImage: file }))
			setVariantImagePreview(URL.createObjectURL(file))
			setVariantImageRemoved(false)
			if (backendErrors.vehicleImage) {
				setBackendErrors((prev) => ({ ...prev, vehicleImage: "" }))
			}
		}
	}

	const handleVariantImageDelete = () => {
		setVariantFormData((prev) => ({ ...prev, vehicleImage: null }))
		setVariantImagePreview(null)
		setVariantImageRemoved(true)
		const fileInput = document.getElementById("variantImage")
		if (fileInput) fileInput.value = ""
		if (backendErrors.vehicleImage) {
			setBackendErrors((prev) => ({ ...prev, vehicleImage: "" }))
		}
	}

	const handleVariantMapImageChange = (e) => {
		const file = e.target.files[0]
		if (file) {
			setVariantFormData((prev) => ({ ...prev, mapImage: file }))
			setVariantMapImagePreview(URL.createObjectURL(file))
			setVariantMapImageRemoved(false)
			if (backendErrors.mapImage) {
				setBackendErrors((prev) => ({ ...prev, mapImage: "" }))
			}
		}
	}

	const handleVariantMapImageDelete = () => {
		setVariantFormData((prev) => ({ ...prev, mapImage: null }))
		setVariantMapImagePreview(null)
		setVariantMapImageRemoved(true)
		const fileInput = document.getElementById("variantMapImage")
		if (fileInput) fileInput.value = ""
		if (backendErrors.mapImage) {
			setBackendErrors((prev) => ({ ...prev, mapImage: "" }))
		}
	}

	const handleVariantAnimationChange = (e) => {
		const file = e.target.files[0]
		if (file) {
			setVariantFormData((prev) => ({ ...prev, animationFile: file }))
			setVariantAnimationPreview(URL.createObjectURL(file))
			setVariantAnimationRemoved(false)
			if (backendErrors.animationFile) {
				setBackendErrors((prev) => ({ ...prev, animationFile: "" }))
			}
		}
	}

	const handleVariantAnimationDelete = () => {
		setVariantFormData((prev) => ({ ...prev, animationFile: null }))
		setVariantAnimationPreview(null)
		setVariantAnimationRemoved(true)
		const fileInput = document.getElementById("variantAnimation")
		if (fileInput) fileInput.value = ""
		if (backendErrors.animationFile) {
			setBackendErrors((prev) => ({ ...prev, animationFile: "" }))
		}
	}

	const handleVariantStatusChange = (selectedOption) => {
		if (selectedOption) {
			setVariantFormData((prev) => ({
				...prev,
				status: selectedOption.value,
			}))
		}
		setBackendErrors((prev) => ({ ...prev, status: "" }))
	}

	// Handle add variant
	const handleAddVariantClick = () => {
		if (!vehicleTypesPermissions.can_add) {
			toast.error("You don't have permission to create vehicle types")
			return
		}
		setEditingVariant({ isNew: true })
		setVariantFormData({
			name: "",
			vehicleImage: null,
			mapImage: null,
			animationFile: null,
			description: "",
			vehicle_id: "",
			capacity: "1",
			commission: "",
			status: "1"
		})
		setVariantImagePreview(null)
		setVariantMapImagePreview(null)
		setVariantAnimationPreview(null)
		setVariantImageRemoved(false)
		setVariantMapImageRemoved(false)
		setVariantAnimationRemoved(false)
		setBackendErrors({})
		setIsModalOpen(true)
	}

	// Handle edit variant
	const handleEditVariantClick = useCallback((variant) => {
		if (!vehicleTypesPermissions.can_edit) {
			toast.error("You don't have permission to edit vehicle types")
			return
		}
		setEditingVariant(variant)
		setVariantFormData({
			name: variant.name || "",
			description: variant.description || "",
			vehicleImage: null,
			mapImage: null,
			animationFile: null,
			vehicle_id: variant.vehicle_id ? variant.vehicle_id.toString() : "",
			capacity: variant.capacity ? variant.capacity.toString() : "1",
			commission: variant.commission != null ? variant.commission.toString() : "",
			status: variant.status == 1 ? "1" : "0",
		})
		setVariantImagePreview(variant.image || null)
		setVariantMapImagePreview(variant.mapImage || null)
		setVariantAnimationPreview(variant.animation || null)
		setVariantImageRemoved(false)
		setVariantMapImageRemoved(false)
		setVariantAnimationRemoved(false)
		setBackendErrors({})
		setIsModalOpen(true)
	}, [vehicleTypesPermissions.can_edit])

	const handleCancelVariantEdit = () => {
		setEditingVariant(null)
		setVariantFormData({
			name: "",
			vehicleImage: null,
			mapImage: null,
			animationFile: null,
			description: "",
			vehicle_id: "",
			capacity: "1",
			commission: "",
			status: "1"
		})
		setVariantImagePreview(null)
		setVariantMapImagePreview(null)
		setVariantAnimationPreview(null)
		setVariantImageRemoved(false)
		setVariantMapImageRemoved(false)
		setVariantAnimationRemoved(false)
		setBackendErrors({})
		setIsModalOpen(false)
	}

	const handleSaveVariant = async () => {
		setIsSubmitting(true)
		try {
			const form = new FormData()
			form.append("name", variantFormData.name)
			form.append("description", variantFormData.description || "")
			form.append("vehicle_id", variantFormData.vehicle_id)
			form.append("capacity", variantFormData.capacity)
			form.append("commission", variantFormData.commission)
			form.append("status", variantFormData.status)
			// Handle vehicle image
			if (variantFormData.vehicleImage) {
				form.append("image", variantFormData.vehicleImage)
			}
			if (!editingVariant?.isNew) {
				form.append("imageRemoved", variantImageRemoved.toString())
			}
			// Handle map image
			if (variantFormData.mapImage) {
				form.append("mapImage", variantFormData.mapImage)
			}
			if (!editingVariant?.isNew) {
				form.append("mapImageRemoved", variantMapImageRemoved.toString())
			}
			// Handle animation file
			if (variantFormData.animationFile) {
				form.append("animation", variantFormData.animationFile)
			}
			if (!editingVariant?.isNew) {
				form.append("animationRemoved", variantAnimationRemoved.toString())
			}
			let response
			if (editingVariant?.isNew) {
				response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/vehicle-types`, form, {
					headers: { "Content-Type": "multipart/form-data" },
				})
			} else {
				response = await axios.put(`${import.meta.env.VITE_API_URL}/admin/vehicle-types/${editingVariant.id}`, form, {
					headers: { "Content-Type": "multipart/form-data" },
				})
			}
			if (response.data.success) {
				toast.success(editingVariant?.isNew ? "Variant created successfully" : "Variant updated successfully")
				fetchVariants(currentPage, perPage, searchQuery, statusFilter, vehicleFilter, sortField, sortDirection)
				handleCancelVariantEdit()
			}
		} catch (err) {
			if (err.response?.status === 400 && err.response.data.errors) {
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			} else
				if (err.response?.status === 404) {
					toast.error("Variant not found.")
				} else {
					toast.error("Failed to save variant.")
					console.error("Save variant error:", err)
				}
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleDeleteVariantClick = useCallback(async (id) => {
		if (window.confirm("Are you sure you want to delete this variant?")) {
			try {
				const response = await axios.delete(`${import.meta.env.VITE_API_URL}/admin/vehicle-types/${id}`)
				if (response.data.success) {
					toast.success("Variant deleted successfully")
					fetchVariants(currentPage, perPage, searchQuery, statusFilter, vehicleFilter, sortField, sortDirection)
				}
			} catch (err) {
				toast.error(err.response?.status === 404 ? "Variant not found." : "Failed to delete variant.")
				console.error("Delete variant error:", err)
			}
		}
	}, [fetchVariants, currentPage, perPage, searchQuery, statusFilter, vehicleFilter, sortField, sortDirection])

	// Handle modal close
	const handleModalClose = () => {
		handleCancelVariantEdit()
	}

	// Reset filters
	const resetFilters = () => {
		setSearchQuery("")
		setStatusFilter("")
		setVehicleFilter("")
		setCurrentPage(1)
		setIsFilterOffcanvasOpen(false)
	}

	// Handle form submit
	const handleSubmit = (e) => {
		e.preventDefault()
		handleSaveVariant()
	}

	// DataTable columns - with conditional Actions column
	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName: "S.No",
				valueGetter: (params) => (currentPage - 1) * perPage + params.node.rowIndex + 1,
				width: 100,
				sortable: false,
			},
			{
				headerName: "Image",
				field: "image",
				minWidth: 150,
				sortable: false,
				filter: false,
				cellRenderer: (params) => {
					if (!params.data?.image) return (
						<div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
							<span className="text-xs text-gray-500">No Image</span>
						</div>
					)
					return (
						<img
							src={params.data.image}
							alt={params.data.name || "Vehicle"}
							className="w-10 h-10 object-contain rounded-md"
						/>
					)
				},
			},
			{
				headerName: "Variant",
				field: "name",
				cellRenderer: (params) => (
					<div className="text-left">
						<h3 className="font-medium text-lg">{params.data?.name}</h3>
						<p className="text-sm text-gray-500 truncate">
							{params.data?.description || "No description"}
						</p>
					</div>
				),
				sortable: true,
				minWidth: 150,
				flex: 1,
			},
			{
				headerName: "Vehicle",
				field: "vehicleName",
				sortable: false,
				minWidth: 120,
				flex: 1,
				cellRenderer: (params) => (
					<div className="text-left">
						<h3 className="font-medium text-lg">{params.data?.vehicleName}</h3>
					</div>
				),
			},
			{
				headerName: "Capacity",
				field: "capacity",
				sortable: true,
				minWidth: 90,
				flex: 1,
				cellRenderer: (params) => (
					<div className="flex items-center justify-center">
						<Users size={14} className="mr-1 text-gray-400" />
						<p className="text-sm font-medium">{params.data.capacity}</p>
					</div>
				),
			},
			{
				headerName: commissionType === "percentage" ? "Commission (%)" : "Commission (₹)",
				field: "commission",
				minWidth: 130,
				sortable: true,
				cellRenderer: (params) => {
					const val = params.value
					const formatted = val != null ? Number(val).toFixed(2) : "0.00"
					return commissionType === "percentage" ? `${formatted}%` : `₹${formatted}`
				}
			},
			{
				headerName: "Status",
				field: "status",
				cellRenderer: (params) => {
					const isActive = params.value === 1
					return (
						<span className={`px-2 py-1 rounded-full text-xs ${isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
							{isActive ? "Active" : "Inactive"}
						</span>
					)
				},
				minWidth: 100,
				flex: 1,
			},
		]
		// Only add Actions column if user has edit or delete permission
		if (vehicleTypesPermissions.can_edit || vehicleTypesPermissions.can_delete) {
			baseColumns.push({
				headerName: "Actions",
				field: "actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						{vehicleTypesPermissions.can_edit && (
							<button
								onClick={() => handleEditVariantClick(params.data)}
								className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
								title="Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{vehicleTypesPermissions.can_delete && (
							<button
								onClick={() => handleDeleteVariantClick(params.data.id)}
								className="p-1 text-red-600 hover:text-red-800 transition-colors"
								title="Delete"
							>
								<Trash2 size={16} />
							</button>
						)}
					</div>
				),
				minWidth: 100,
				flex: 0.5,
				sortable: false,
			})
		}
		return baseColumns
	}, [theme.primaryGradientStart, currentPage, perPage, vehicleTypesPermissions, handleEditVariantClick, handleDeleteVariantClick, commissionType])

	// Render variant form
	const renderVariantForm = () => (
		<form onSubmit={handleSubmit} className="space-y-6 p-4">
			<div className="grid md:grid-cols-4 gap-4">
				<ThemeUI.FormField
					label="Vehicle"
					name="vehicle_id"
					error={backendErrors.vehicle_id}
					required={true}
				>
					<ThemeUI.Select
						id="vehicle_id"
						name="vehicle_id"
						value={variantFormData.vehicle_id}
						onChange={(selected) =>
							handleVariantInputChange({
								target: { name: "vehicle_id", value: selected?.value || "" },
							})
						}
						options={Array.isArray(vehicles) ? vehicles.map((vehicle) => ({
							value: vehicle.id.toString(),
							label: vehicle.name,
						})) : []}
						placeholder="Select a vehicle"
						error={backendErrors.vehicle_id}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Variant Name"
					name="name"
					error={backendErrors.name}
					required={true}
				>
					<ThemeUI.Input
						id="name"
						name="name"
						value={variantFormData.name}
						onChange={handleVariantInputChange}
						placeholder="e.g., MINI, COMFORT, XL"
						error={backendErrors.name}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Capacity"
					name="capacity"
					error={backendErrors.capacity}
					required={true}
				>
					<ThemeUI.Input
						id="capacity"
						name="capacity"
						type="number"
						min="1"
						value={variantFormData.capacity}
						onChange={handleVariantInputChange}
						placeholder="e.g., 4"
						error={backendErrors.capacity}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label={commissionLabel}
					name="commission"
					error={backendErrors.commission}
				>
					<ThemeUI.Input
						id="commission"
						name="commission"
						type="number"
						min="0"
						step="0.01"
						value={variantFormData.commission}
						onChange={handleVariantInputChange}
						placeholder={commissionPlaceholder}
						error={backendErrors.commission}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Description"
					name="description"
					error={backendErrors.description}
				>
					<ThemeUI.Textarea
						id="description"
						name="description"
						rows="2"
						value={variantFormData.description}
						onChange={handleVariantInputChange}
						placeholder="Enter variant description"
						error={backendErrors.description}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Variant Image"
					name="vehicleImage"
					error={backendErrors.vehicleImage}
					required={true}
				>
					<ThemeUI.FileInput
						id="variantImage"
						name="vehicleImage"
						onChange={handleVariantImageChange}
						accept="image/png,image/jpeg,image/jpg"
						preview={variantImagePreview}
						onDelete={handleVariantImageDelete}
						error={backendErrors.vehicleImage}
						showDeleteIcon={false}
					/>
					<p className="text-xs text-gray-500 mt-1">
						16:9 aspect ratio recommended
					</p>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Map Image"
					name="mapImage"
					error={backendErrors.mapImage}
					required={true}
				>
					<ThemeUI.FileInput
						id="variantMapImage"
						name="mapImage"
						onChange={handleVariantMapImageChange}
						accept="image/png,image/jpeg,image/jpg"
						preview={variantMapImagePreview}
						onDelete={handleVariantMapImageDelete}
						error={backendErrors.mapImage}
						showDeleteIcon={false}
					/>
					<p className="text-xs text-gray-500 mt-1">
						16:9 aspect ratio recommended
					</p>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Animation File"
					name="animationFile"
					error={backendErrors.animationFile}
					required={true}
				>
					<ThemeUI.FileInput
						id="variantAnimation"
						name="animationFile"
						onChange={handleVariantAnimationChange}
						accept=".json,image/gif"
						preview={variantAnimationPreview}
						onDelete={handleVariantAnimationDelete}
						error={backendErrors.animationFile}
						showDeleteIcon={false}
					/>
					<p className="text-xs text-gray-500 mt-1">
						Upload Lottie (.json) or GIF file
					</p>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Status"
					name="status"
					error={backendErrors.status}
					required
				>
					<ThemeUI.Select
						id="status"
						name="status"
						value={variantFormData.status}
						onChange={handleVariantStatusChange}
						options={[
							{ value: "1", label: "Active" },
							{ value: "0", label: "Inactive" },
						]}
						placeholder="Select status"
						error={backendErrors.status}
						isSearchable={false}
					/>
				</ThemeUI.FormField>
			</div>
			<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<ThemeUI.Button
					type="button"
					onClick={handleCancelVariantEdit}
					gradientColors={{
						start: theme.secondaryGradientStart,
						end: theme.secondaryGradientEnd,
					}}
					direction={theme.gradientDirection}
				>
					Cancel
				</ThemeUI.Button>
				<ThemeUI.Button
					type="button"
					onClick={handleSaveVariant}
					loading={isSubmitting}
					gradientColors={{
						start: theme.primaryGradientStart,
						end: theme.primaryGradientEnd,
					}}
					direction={theme.gradientDirection}
				>
					{isSubmitting ? (
						<div className="flex items-center space-x-2">
							<Loader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
							<span>Saving...</span>
						</div>
					) : (
						<>Save</>
					)}
				</ThemeUI.Button>
			</div>
		</form>
	)
	return (
		<Layout>
			{/* Header and breadcrumb */}
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Vehicle Types</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li>
							<a href="/dashboard" className="hover:text-blue-600 transition-colors">
								Home
							</a>
						</li>
						<li className="flex items-center">
							<ChevronRight className="h-4 w-4 mx-1" />
						</li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">
							Vehicle Types
						</li>
					</ol>
				</nav>
			</div>
			{/* Search and filter controls */}
			<div className="mb-4 rounded-lg w-full">
				<div className="flex justify-between items-center gap-2">
					<div className="w-full max-sm:flex-1 sm:w-1/3">
						<ThemeUI.Input
							id="search"
							name="search"
							value={searchQuery}
							className="bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
							onChange={handleSearchChange}
							placeholder={placeholder}
							leftElement={<Search size={16} className="text-gray-400" />}
						/>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 w-full max-sm:w-fit sm:w-auto h-full">
						<ThemeUI.Button
							type="button"
							onClick={() => setIsFilterOffcanvasOpen(true)}
							gradientColors={{
								start: theme.secondaryGradientStart,
								end: theme.secondaryGradientEnd,
							}}
							direction={theme.gradientDirection}
							aria-label="Open filter options"
						>
							<Filter size={16} className="sm:mr-2" />
							<p className="max-sm:hidden">Filters</p>
						</ThemeUI.Button>
						{vehicleTypesPermissions.can_add && (
							<ThemeUI.Button
								type="button"
								onClick={handleAddVariantClick}
								gradientColors={{
									start: theme.primaryGradientStart,
									end: theme.primaryGradientEnd,
								}}
								direction={theme.gradientDirection}
							>
								<Plus size={16} className="sm:mr-2" />
								<p className="max-sm:hidden">Add Variant</p>
							</ThemeUI.Button>
						)}
					</div>
				</div>
			</div>
			{/* AG Grid - DataTable */}
			<div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
				<AgGridReact
					className="custom-ag-grid"
					domLayout="autoHeight"
					theme={themeQuartz.withParams({
						spacing: 7,
						headerHeight: 45,
						headerFontSize: 16,
						fontSize: 13,
						headerTextColor: "white",
						paginationPanelHeight: 50,
						backgroundColor: theme === 'dark' ? '#121212' : '#ffffff',
					})}
					defaultColDef={{
						resizable: false,
						suppressSizeToFit: false,
					}}
					rowData={variants}
					rowHeight={55}
					columnDefs={columnDefs}
					pagination={true}
					paginationPageSize={perPage} 
					suppressPaginationPanel={false}
					onSortChanged={(params) => {
						const sortModel = params.api.getColumnState().find(s => s.sort != null);
						if (sortModel) {
							setSortField(sortModel.colId);
							setSortDirection(sortModel.sort);
							setCurrentPage(1); 
						}
					}}
					onPaginationChanged={(params) => {
						if (params.newPage) { 
							const newPage = params.api.paginationGetCurrentPage() + 1;
							if (newPage !== currentPage) {
								handlePageChange(newPage);
							}
						}
					}}

					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Vehicle Types Found" }}
					suppressCellFocus
				/>
			</div>
			{/* Edit Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				title={editingVariant?.isNew ? "Add New Variant" : "Edit Variant"}
				size="XL"
			>
				{renderVariantForm()}
			</Modal>
			{/* Filter Offcanvas */}
			<Offcanvas
				isOpen={isFilterOffcanvasOpen}
				onClose={() => setIsFilterOffcanvasOpen(false)}
				title="Filter Options"
				position="right"
				size="md"
			>
				<div className="space-y-4">
					<ThemeUI.FormField label="Status Filter">
						<ThemeUI.Select
							value={statusFilter}
							onChange={(selected) => {
								setStatusFilter(selected?.value || "")
								setCurrentPage(1)
							}}
							options={[
								{ value: "1", label: "Active" },
								{ value: "0", label: "Inactive" },
							]}
							placeholder="Filter by status"
							isClearable
							isSearchable={false}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Vehicle Filter">
						<ThemeUI.Select
							value={vehicleFilter}
							onChange={(selected) => {
								setVehicleFilter(selected?.value || "")
								setCurrentPage(1)
							}}
							options={Array.isArray(vehicles) ? vehicles.map((vehicle) => ({
								value: vehicle.id.toString(),
								label: vehicle.name,
							})) : []}
							placeholder="Filter by vehicle"
							isClearable
							isSearchable={false}
						/>
					</ThemeUI.FormField>
					<div className="flex gap-2">
						<ThemeUI.Button
							type="button"
							onClick={resetFilters}
							gradientColors={{
								start: theme.secondaryGradientStart,
								end: theme.secondaryGradientEnd,
							}}
						>
							Reset Filters
						</ThemeUI.Button>
					</div>
				</div>
			</Offcanvas>
		</Layout>
	)
}
export default VehicleTypes