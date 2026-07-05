import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2 } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import ServiceAreaMap from "./ServiceAreaMap"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
ModuleRegistry.registerModules([AllCommunityModule])
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
function Services() {
	const { theme } = useTheme()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [isVehicleTypesLoading, setIsVehicleTypesLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [services, setServices] = useState([])
	const [vehicleTypes, setVehicleTypes] = useState([])
	const [editingService, setEditingService] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})
	const [formData, setFormData] = useState({
		name: "",
		polygon_coordinates: [],
		vehicle_type_ids: [],
		status: 1,
	})
	const [mapKey, setMapKey] = useState(0)

	// Initialize permissions with safe defaults
	const [servicesPermissions, setServicesPermissions] = useState({
		can_add: false,
		can_edit: false,
		can_delete: false,
		can_view: false
	})

	// Get user permissions for the services module 
	const getUserPermissions = useCallback(() => {
		try {
			const permissionsStr = localStorage.getItem('userPermissions')
			if (permissionsStr) {
				const permissions = JSON.parse(permissionsStr)
				if (permissions.services) {
					return {
						can_add: permissions.services.can_add || false,
						can_edit: permissions.services.can_edit || false,
						can_delete: permissions.services.can_delete || false,
						can_view: permissions.services.can_view || false
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
		setServicesPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setServicesPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])
	const safeParseJSON = (value) => {
		if (!value) return []
		try {
			let parsed = typeof value === "string" ? JSON.parse(value) : value
			if (typeof parsed === "string") {
				parsed = JSON.parse(parsed)
			}
			return Array.isArray(parsed) ? parsed : []
		} catch (err) {
			console.error("Error parsing JSON:", err)
			return []
		}
	}

	useEffect(() => {
		fetchVehicleTypes()
	}, [])

	useEffect(() => {
		fetchServices(currentPage, perPage, searchQuery, statusFilter)
	}, [currentPage, perPage, searchQuery, statusFilter])

	// Ensure formData.polygon_coordinates is updated
	useEffect(() => {
		setFormData((prev) => ({
			...prev,
			polygon_coordinates: formData.polygon_coordinates,
		}))
	}, [formData.polygon_coordinates])

	// Handle polygon coordinates change from map
	const handlePolygonCoordinatesChange = useCallback((coordinates) => {
		setFormData((prev) => ({
			...prev,
			polygon_coordinates: coordinates,
		}))
		setBackendErrors((prev) => ({ ...prev, polygon_coordinates: "" }))
	}, [])

	// Add Service Btn
	const handleAddClick = () => {
		setEditingService({ isNew: true })
		setFormData({
			name: "",
			polygon_coordinates: [],
			vehicle_type_ids: [],
			status: 1,
		})
		setBackendErrors({})
		setMapKey((prev) => prev + 1)
		setIsModalOpen(true)
	}

	// Edit Service handler
	const handleEditClick = (service) => {
		setEditingService(service)
		const vehicleTypeIds = safeParseJSON(service.vehicle_type_ids)
			.map((id) => {
				const numId = parseInt(id, 10)
				return isNaN(numId) ? 0 : numId
			})
			.filter((id) => id > 0)
		const polygonCoordinates = safeParseJSON(service.polygon_coordinates)
		const statusValue = service.status === 1 || service.status === "1" ? 1 : 0
		const newFormData = {
			name: service.name || "",
			polygon_coordinates: polygonCoordinates,
			vehicle_type_ids: vehicleTypeIds,
			status: statusValue,
		}
		setFormData(newFormData)
		setBackendErrors({})
		setMapKey((prev) => prev + 1)
		setIsModalOpen(true)
	}

	// Save Service Btn
	const handleSaveService = async () => {
		setIsLoading(true)
		try {
			const response = await axios[method](url, submitData)
			if (response.status === 200 || response.status === 201 || response.data.success) {
				toast.success(
					editingService?.isNew
						? "Service created successfully"
						: "Service updated successfully"
				)
				fetchServices(currentPage, perPage, searchQuery, statusFilter)
				handleCancelEdit()
			}
		} catch (err) {
		} finally {
			setIsLoading(false)
		}
	}

	// Delete Service Btn
	const handleDeleteClick = async (service) => {
		if (!window.confirm(`Are you sure you want to delete ${service.name}?`))
			return
		setIsLoading(true)
		try {
			const response = await axios.delete(
				`${import.meta.env.VITE_API_URL}/admin/services/${service.id}`
			)
			if (response.data.success) {
				toast.success("Service deleted successfully")
				fetchServices(currentPage, perPage, searchQuery, statusFilter)
			}
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to delete service")
			console.error("handleDeleteClick error:", err)
		} finally {
			setIsLoading(false)
		}
	}

	// Cancel Service Btn
	const handleCancelEdit = () => {
		setEditingService(null)
		setFormData({
			name: "",
			polygon_coordinates: [],
			vehicle_type_ids: [],
			status: 1,
		})
		setBackendErrors({})
		setIsModalOpen(false)
	}

	// Get all the Vehicle types
	const fetchVehicleTypes = async () => {
		setIsVehicleTypesLoading(true)
		try {
			const response = await axios.get( 
				`${import.meta.env.VITE_API_URL}/admin/vehicle-types`
			)
			if (response.data.success) {
				setVehicleTypes(response.data.data)
			}
		} catch (err) {
			console.error("Error fetching vehicle types:", err)
			toast.error("Failed to fetch vehicle types")
		} finally {
			setIsVehicleTypesLoading(false)
		}
	}

	const fetchServices = async (page = 1, limit = 10, search = "", status = "") => {
		setIsLoading(true)
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/services`, {
				params: {
					page,
					limit,
					search,
					status: status === "all" ? "" : status,
					_t: Date.now()
				},
			})
			if (response.status === 200 || response.data.success) {
				setServices(response.data.data)
				setTotalRows(response.data.total || 0)
			}
		} catch (err) {
			console.error("Error fetching services:", err)
			toast.error("Failed to fetch services")
		} finally {
			setIsLoading(false)
		}
	}

	// Input change
	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}))
		setBackendErrors((prev) => ({ ...prev, [name]: "" }))
	}

	// Handle status change specifically
	const handleStatusChange = (selectedOption) => {
		setFormData((prev) => ({
			...prev,
			status: selectedOption.value,
		}))
		setBackendErrors((prev) => ({ ...prev, status: "" }))
	}

	// Vehicle type selection handler
	const handleVehicleTypeChange = (selectedOptions) => {
		const selectedIds = selectedOptions
			? selectedOptions.map((option) => {
				return parseInt(option, 10)
			})
			: []
		setFormData((prev) => ({
			...prev,
			vehicle_type_ids: selectedIds,
		}))
		if (backendErrors.vehicle_type_ids) {
			setBackendErrors((prev) => ({ ...prev, vehicle_type_ids: "" }))
		}
	}

	// Handle table search
	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	const handlePageChange = (page) => {
		setCurrentPage(page)
	}

	const handlePerRowsChange = (newPerPage, page) => {
		setPerPage(newPerPage)
		setCurrentPage(page)
	}

	// DataTable columns - with conditional Actions column
	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName: "ID",
				valueGetter: (params) => (currentPage - 1) * perPage + params.node.rowIndex + 1,
				width: 80,
				sortable: false,
			},
			{
				headerName: "Name",
				field: "name",
				sortable: true,
				minWidth: 150,
				flex: 1,
			},
			{
				headerName: "Status",
				field: "status",
				sortable: true,
				minWidth: 100,
				flex: 1,
			},
		]
		// Only add Actions column if user has edit or delete permission
		baseColumns.push({
			headerName: "Actions",
			field: "actions",
			cellRenderer: (params) => (
				<div className="flex items-center gap-2">
					<button
						onClick={() => handleEditClick(params.data)}
						className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
						title="Edit"
					>
						<Edit size={16} style={{ color: theme.primaryGradientStart }} />
					</button>
				</div>
			),
			minWidth: 100,
			flex: 0.5,
			sortable: false,
		})
		return baseColumns
	}, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, setServicesPermissions, handleEditClick])

	// Form rendering with better value handling
	const renderServiceForm = () => {
		return (
			<div className="space-y-6 p-4">
				<div className="grid md:grid-cols-3 gap-4">
					<ThemeUI.FormField
						label="Service Name"
						name="name"
						error={backendErrors.name}
						required={true}
					>
						<ThemeUI.Input
							id="name"
							name="name"
							value={formData.name}
							onChange={handleInputChange}
							placeholder="e.g., Bengaluru Service"
							error={backendErrors.name}
						/>
					</ThemeUI.FormField>

					<ThemeUI.FormField
						label="Vehicle Types"
						name="vehicle_type_ids"
						error={backendErrors.vehicle_type_ids}
					>
						<ThemeUI.Select
							id="vehicle_type_ids"
							name="vehicle_type_ids"
							isMulti={true}
							value={formData.vehicle_type_ids.map((id) => id.toString())}
							onChange={handleVehicleTypeChange}
							options={vehicleTypes.map((vt) => ({
								value: vt.id.toString(),
								label: vt.name,
							}))}
							placeholder="Select vehicle types"
							error={backendErrors.vehicle_type_ids}
							key={`vehicle-types-${editingService?.id || "new"
								}-${JSON.stringify(formData.vehicle_type_ids)}`}
						/>
					</ThemeUI.FormField>

					<ThemeUI.FormField
						label="Status"
						name="status"
						error={backendErrors.status}
						required={true}
					>
						<ThemeUI.Select
							id="status"
							name="status"
							value={formData.status}
							onChange={handleStatusChange}
							options={[
								{ value: 1, label: "Active" },
								{ value: 0, label: "Inactive" },
							]}
							placeholder="Select status"
							key={`status-${editingService?.id || "new"}-${formData.status}`}
						/>
					</ThemeUI.FormField>
				</div>

				<div>
					<ThemeUI.FormField
						label="Service Areas"
						name="polygon_coordinates"
						error={backendErrors.polygon_coordinates}
					>
						<div className="mt-2">
							<ServiceAreaMap
								coordinates={formData.polygon_coordinates}
								onCoordinatesChange={handlePolygonCoordinatesChange}
								apiKey={googleMapsApiKey}
								initialCenter={{ lat: 12.9716, lng: 77.5946 }}
								initialZoom={11}
								key={`map-${mapKey}`}
							/>
						</div>
						{backendErrors.polygon_coordinates && (
							<p className="mt-1 text-sm text-red-600">
								{backendErrors.polygon_coordinates}
							</p>
						)}
						<p className="mt-1 text-sm text-gray-500">
							Draw polygon areas to define service coverage. You can draw
							multiple areas and edit them by dragging the points.
						</p>
					</ThemeUI.FormField>
				</div>

				<div className="flex justify-end gap-3 pt-4">
					<ThemeUI.Button
						type="button"
						onClick={handleCancelEdit}
						gradientColors={{
							start: theme.secondaryGradientStart,
							end: theme.secondaryGradientEnd,
						}}
					>
						Cancel
					</ThemeUI.Button>
					<ThemeUI.Button
						type="button"
						onClick={handleSaveService}
						disabled={isLoading}
						gradientColors={{
							start: theme.primaryGradientStart,
							end: theme.primaryGradientEnd,
						}}
						direction={theme.gradientDirection}
					>
						{isLoading ? (
							<>
								<Loader size={16} className="mr-2 animate-spin" />
								Saving...
							</>
						) : editingService?.isNew ? (
							"Create Service"
						) : (
							"Update Service"
						)}
					</ThemeUI.Button>
				</div>
			</div>
		)
	}

	return (
		<Layout>
			<div className="flex items-center mb-4">
				<h1 className="text-2xl flex-1 font-bold max-sm:text-xl">
					Service Management
				</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li>
							<a
								href="/dashboard"
								className="hover:text-blue-600 transition-colors"
							>
								Home
							</a>
						</li>
						<li className="flex items-center">
							<ChevronRight className="h-4 w-4 mx-1" />
						</li>
						<li
							style={{ color: theme.primaryGradientStart }}
							className="font-medium"
						>
							Services
						</li>
					</ol>
				</nav>
			</div>
			<div className="mb-4 rounded-lg w-full">
				<div className="flex flex-col sm:flex-row justify-between items-center gap-2">
					<div className="w-full sm:w-1/3">
						<ThemeUI.Input
							id="search"
							name="search"
							value={searchQuery}
							className="bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
							onChange={handleSearchChange}
							placeholder="Search by name..."
							leftElement={<Search size={16} className="text-gray-400" />}
						/>
					</div>
					<div className="flex max-sm:h-10 justify-between gap-2 w-full sm:w-auto max-sm:text-sm">
						<ThemeUI.Button
							type="button"
							onClick={() => setIsFilterOffcanvasOpen(true)}
							gradientColors={{
								start: theme.secondaryGradientStart,
								end: theme.secondaryGradientEnd,
							}}
							direction={theme.gradientDirection}
						>
							<Filter size={16} className="mr-2" /> Filters
						</ThemeUI.Button>
						{servicesPermissions.can_add && (
							<ThemeUI.Button
								type="button"
								onClick={handleAddClick}
								gradientColors={{
									start: theme.primaryGradientStart,
									end: theme.primaryGradientEnd,
								}}
								direction={theme.gradientDirection}
							>
								<Plus size={16} className="mr-2" /> Add Service
							</ThemeUI.Button>
						)}
					</div>
				</div>
			</div>
			<div
				style={{
					"--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
				}}
			>
				<AgGridReact
					className="custom-ag-grid"
					domLayout="autoHeight"
					columnDefs={columnDefs}
					rowData={services}
					rowHeight={55}
					pagination={true}
					paginationPageSize={perPage}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					suppressPaginationPanel={false}
					onPaginationChanged={(params) => {
						if (params.api) {
							const gridPage = params.api.paginationGetCurrentPage() + 1;
							const gridPageSize = params.api.paginationGetPageSize();
							if (gridPage !== currentPage && !isLoading) {
								handlePageChange(gridPage);
							}
							if (gridPageSize !== perPage) {
								handlePerRowsChange(gridPageSize, gridPage);
							}
						}
					}}

					theme={themeQuartz.withParams({
						spacing: 7,
						headerHeight: 45,
						headerFontSize: 16,
						fontSize: 13,
						headerTextColor: "white",
						paginationPanelHeight: 50,
					})}
					defaultColDef={{
						resizable: false,
						flex: 1,
					}}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Services Found" }}
				/>
			</div>
			<Modal
				isOpen={isModalOpen}
				onClose={handleCancelEdit}
				title={editingService?.isNew ? "Add Service" : "Edit Service"}
				size="full"
			>
				{renderServiceForm()}
			</Modal>
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
							value={
								statusFilter
									? {
										value: statusFilter,
										label: statusFilter === "active" ? "Active" : "Inactive",
									}
									: null
							}
							onChange={(selected) => setStatusFilter(selected?.value || "")}
							options={[
								{ value: "active", label: "Active" },
								{ value: "inactive", label: "Inactive" },
							]}
							placeholder="Filter by status"
							isClearable={true}
						/>
					</ThemeUI.FormField>
				</div>
			</Offcanvas>
		</Layout>
	)
}
export default Services
