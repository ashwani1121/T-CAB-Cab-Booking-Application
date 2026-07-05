import React, { useState, useEffect, useCallback,useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Eye, Phone, MapPin, AlertTriangle,NonBinary } from "lucide-react" 
import { format } from "date-fns"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import debounce from "lodash/debounce"
import { AgGridReact } from "ag-grid-react"
import NoRowsOverlay from "./NoRowsOverlay"
import { themeQuartz } from "ag-grid-community"
const Sos = () => {
	const { theme } = useTheme()
	const [isLoading, setIsLoading] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("logged")
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [sos, setSos] = useState([])
	const [backendErrors, setBackendErrors] = useState({})
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [selectedSosId, setSelectedSosId] = useState(null)
	const [sosDetails, setSosDetails] = useState(null)
	const [isLoadingDetails, setIsLoadingDetails] = useState(false)
	const [statusUpdating, setStatusUpdating] = useState(false)
	const [selectedStatus, setSelectedStatus] = useState("")
	const [statusReason, setStatusReason] = useState("")

	// Initialize permissions with safe defaults
	const [sosPermissions, setSosPermissions]         = useState({
		can_add                                                 : false,
		can_edit                                                : false,
		can_delete                                              : false,
		can_view                                                : false
	})

	// Get user permissions for the sos module 
	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.sos){
					return {
						can_add     : permissions.sos.can_add || false,
						can_edit    : permissions.sos.can_edit || false,
						can_delete  : permissions.sos.can_delete || false,
						can_view    : permissions.sos.can_view || false
					}
				}
			}
			return{
				can_add         : false,
				can_edit        : false,
				can_delete      : false,
				can_view        : false
			}
		}catch(error){
			console.error('Error parsing user permissions:', error)
			return {
				can_add         : false,
				can_edit        : false,
				can_delete      : false,
				can_view        : false
			}
		}
	}, [])

	// Load permissions on mount
	useEffect(() => {
		const permissions = getUserPermissions()
		setSosPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setSosPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Debounced search handler
	const debouncedFetchSos = useCallback(
		debounce((page, limit, search, status) => {
			fetchSos(page, limit, search, status)
		}, 500),
		[]
	)

	useEffect(() => {
		debouncedFetchSos(currentPage, perPage, searchQuery, statusFilter)
		return () => debouncedFetchSos.cancel()
	}, [currentPage, perPage, searchQuery, statusFilter, debouncedFetchSos])

	// Fetch SOS records
	const fetchSos = async (page = 1, limit = 10, search = "", status = "") => {
		setIsLoading(true)
		try {
		const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/admin/sos`,
			{
			params: {
				page,
				limit,
				search,
				status: status === "all" ? "" : status,
			},
			}
		)
		if (response.data.success) {
			setSos(response.data.data)
			setTotalRows(response.data.total || 0)
		} else {
			toast.error("Failed to fetch SOS records")
		}
		} catch (err) {
		console.error("Error fetching SOS:", err)
		toast.error(err.response?.data?.message || "Failed to fetch SOS records")
		} finally {
		setIsLoading(false)
		}
	}

	// Fetch SOS details by ID
	const fetchSosDetails = async (id) => {
		setIsLoadingDetails(true)
		setBackendErrors({})
		try {
		const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/admin/sos/${id}`
		)
		if (response.data.success) {
			setSosDetails(response.data.data)
		} else {
			toast.error("Failed to fetch SOS details")
		}
		} catch (err) {
		console.error("Error fetching SOS details:", err)
		toast.error(err.response?.data?.message || "Failed to fetch SOS details")
		} finally {
		setIsLoadingDetails(false)
		}
	}

	// Handle view button click
	const handleViewSos = useCallback((id) => {
		setSelectedSosId(id)
		setIsModalOpen(true)
		fetchSosDetails(id)
	}, [])

	const handleStatusUpdate = async () => {
		setStatusUpdating(true)
		setBackendErrors({})
		try {
		const response = await axios.put(
			`${import.meta.env.VITE_API_URL}/admin/sos/${selectedSosId}/status`,
			{
			status: selectedStatus,
			reason: statusReason.trim(),
			}
		)
		if (response.data.success) {
			toast.success("Status updated successfully")
			setSosDetails((prev) => ({
			...prev,
			status: selectedStatus,
			resolved_at:
				selectedStatus !== "logged" ? new Date().toISOString() : null,
			notes: statusReason.trim(),
			}))
			fetchSos(currentPage, perPage, searchQuery, statusFilter)
			setSelectedStatus("") // Reset after successful update
			setStatusReason("")
		}
		} catch (err) {
		console.error("Error updating status:", err)
		if (err.response?.status === 400 && err.response.data.errors) {
			setBackendErrors(err.response.data.errors)
			toast.error("Please fix the errors in the form.")
		} else {
			toast.error(err.response?.data?.message || "Failed to update status")
		}
		} finally {
		setStatusUpdating(false)
		}
	}

	// Handle search input change
	const handleSearchChange = useCallback((e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}, [])

	const handlePageChange = useCallback((page) => {
		setCurrentPage(page)
	}, [])

	const handlePerRowsChange = useCallback((newPerPage, page) => {
		setPerPage(newPerPage)
		setCurrentPage(page)
	}, [])

	// Handle filter change
	const handleFilterChange = useCallback((selectedOption) => {
		const value = selectedOption?.value || "all"
		setStatusFilter(value)
		setCurrentPage(1)
		setIsFilterOffcanvasOpen(false)
	}, [])

	// Close modal
	const handleCloseModal = useCallback(() => {
		setIsModalOpen(false)
		setSelectedSosId(null)
		setSosDetails(null)
		setSelectedStatus("")
		setStatusReason("")
		setBackendErrors({})
	}, [])

	// Get status badge color
	const getStatusBadgeColor = (status) => {
		switch (status?.toLowerCase()) {
		case "resolved":
			return "bg-green-100 text-green-800"
		case "false_alarm":
			return "bg-yellow-100 text-yellow-800"
		case "logged":
		default:
			return "bg-red-100 text-red-800"
		}
	}

    // DataTable columns - with conditional Actions column
    const columnDefs = useMemo(() => {
        const baseColumns = [
            {
                headerName: "ID",
                field: "id",
                sortable: true,
                width: 80,
            },
            {
                headerName: "User",
                field: "user_name",
                sortable: true,
                flex: 1,
            },
            {
                headerName: "Driver",
                field: "driver_name",
                sortable: true,
                flex: 1,
            },
            {
                headerName: "Status",
                field: "status",
                sortable: true,
                flex: 1,
                cellRenderer: (params) => (
                    <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        params.value
                    )}`}
                    >
                    {params.value.charAt(0).toUpperCase() +
                        params.value.slice(1).replace("_", " ")}
                    </span>
                ),
            },
            {
                headerName: "Created On",
                field: "sos_timestamp",
                sortable: true,
                flex: 1.2,
                valueFormatter: (params) =>
                    format(new Date(params.value), "dd MMM yyyy, HH:mm"),
                cellRenderer: (params) => (
                    <span>{format(new Date(params.value), "dd MMM yyyy, HH:mm")}</span>
                ),
            },
			{
				headerName: "Actions",
				field: "actions",
				sortable: false,
				filter: false,
				minWidth: 90,
				flex: 0.4,
				cellRenderer: (params) => (
					<div className="flex gap-2">
					<button
						className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
						title="View Details"
						aria-label={`View SOS details for ${params.data.user_name}`}
						onClick={() => handleViewSos(params.data.id)}
					>
						<Eye size={16} />
					</button>
					</div>
				),
			},
        ]
        return baseColumns
    }, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, sosPermissions])

	// Render SOS details modal content
	const renderSosDetails = () => {
		if (isLoadingDetails) {
		return (
			<div className="flex justify-center items-center h-96">
			<div className="text-center">
				<Loader
				className="animate-spin mx-auto mb-4 text-blue-500"
				size={48}
				/>
				<p className="text-gray-600 font-medium">Loading SOS details...</p>
			</div>
			</div>
		)
		}
		if (!sosDetails) {
		return (
			<div className="text-center py-12">
			<AlertTriangle className="mx-auto mb-4 text-red-400" size={48} />
			<p className="text-gray-500 text-lg">Failed to load SOS details</p>
			</div>
		)
		}
		// Function to open Google Maps with coordinates
		const openLocationInMaps = (latitude, longitude) => {
		if (latitude && longitude) {
			const url = `https://www.google.com/maps?q=${latitude},${longitude}`
			window.open(url, "_blank")
		}
		}
		return (
		<div className="space-y-6">
			{/* Header Section */}
			<div className="flex justify-between items-start mb-6">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">
				SOS Alert #{sosDetails.id}
				</h2>
				<p className="text-gray-500">
				Emergency assistance request details
				</p>
			</div>
			<div className="text-right">
				<span
				className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
					sosDetails.status
				)}`}
				>
				{sosDetails.status.charAt(0).toUpperCase() +
					sosDetails.status.slice(1).replace("_", " ")}
				</span>
			</div>
			</div>
			{/* Info Section */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
			{/* Passenger Info Card */}
			<div className="bg-white border border-gray-200 rounded-xl p-4">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<h4 className="font-medium text-gray-900">Passenger</h4>
					</div>
					<div className="flex items-center gap-2 ">
						<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
						<MapPin size={16} className="text-blue-600" />
						{sosDetails.user?.latitude && sosDetails.user?.longitude && (
							<button
							onClick={() =>
								openLocationInMaps(
								sosDetails.user.latitude,
								sosDetails.user.longitude
								)
							}
							className="p-2 text-blue-600 rounded-lg transition-all duration-200"
							title="View location on map"
							>
							<MapPin size={18} />
							</button>
						)}
						</div>
					</div>
				</div>
				<div className="space-y-2">
				<h3 className="font-bold text-lg text-gray-900">
					{sosDetails.user?.name || "Unknown User"}
				</h3>
				<p className="text-gray-600 flex items-center gap-2">
					<Phone size={14} />
					{sosDetails.user?.mobile || "No mobile number"}
				</p>
				<p className="text-gray-600 flex items-center gap-2">
					<NonBinary size={14} />
					{sosDetails.user?.gender || "Rather not to say"}
				</p>
				</div>
			</div>
			{/* Driver Info */}
			<div className="bg-white border border-gray-200 rounded-xl p-4">
				<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<h4 className="font-medium text-gray-900">Driver</h4>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
					<MapPin size={16} className="text-green-600" />
					{sosDetails.driver?.latitude &&
						sosDetails.driver?.longitude && (
						<button
							onClick={() =>
							openLocationInMaps(
								sosDetails.driver.latitude,
								sosDetails.driver.longitude
							)
							}
							className="p-2 text-green-600 rounded-lg transition-all duration-200"
							title="View driver location on map"
						>
							<MapPin size={18} />
						</button>
						)}
					</div>
				</div>
				</div>
				<div className="space-y-1">
				<h3 className="font-bold text-lg text-gray-900">
					{sosDetails.driver?.name || "No driver assigned"}
				</h3>
				<p className="text-gray-600 flex items-center gap-2">
					<Phone size={14} />
					{sosDetails.driver?.mobile || "No mobile number"}
				</p>
				<p className="text-gray-600 flex items-center gap-2">
					<NonBinary size={14} />
					{sosDetails.driver?.gender || "Rather not to say"}
				</p>
				</div>
			</div>
			{/* Timeline Info Card */}
			<div className="bg-white border border-gray-200 rounded-xl p-4">
				<div className="flex items-center gap-3">
				<h4 className="font-medium text-gray-900">Timeline</h4>
				</div>
				<div className="space-y-2">
				<div>
					<p className="text-sm text-gray-500">Created</p>
					<p className="font-semibold text-gray-900">
					{format(
						new Date(sosDetails.created_at),
						"MMM dd, yyyy • HH:mm"
					)}
					</p>
				</div>
				{sosDetails.resolved_at && (
					<div>
					<p className="text-sm text-gray-500">Resolved</p>
					<p className="font-semibold text-gray-900">
						{format(
						new Date(sosDetails.resolved_at),
						"MMM dd, yyyy • HH:mm"
						)}
					</p>
					</div>
				)}
				</div>
			</div>
			</div>
			{(sosDetails.notes ||
			sosDetails.status === "logged" ||
			sosDetails.user?.address) && (
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Resolution Notes Section */}
				{sosDetails.notes && (
				<div className="border border-gray-200 rounded-lg p-4">
					<div className="flex items-center gap-2 mb-3">
					<h4 className="font-medium text-gray-900">
						Resolution Notes
					</h4>
					</div>
					<p className="text-sm text-gray-700">{sosDetails.notes}</p>
				</div>
				)}
				{/* Status Update Section (if notes don't exist but status is logged) */}
				{!sosDetails.notes && sosDetails.status === "logged" && (
				<div className="border border-gray-200 rounded-lg p-4">
					<div className="flex items-center gap-2 mb-4">
					<h4 className="font-semibold text-gray-900">
						Update Alert Status
					</h4>
					</div>
					<div className="flex items-end gap-4">
					<div className="flex-1">
						<ThemeUI.FormField
						label="New Status"
						name="newStatus"
						error={backendErrors.status}
						required={true}
						>
						<ThemeUI.Select
							value={selectedStatus}
							onChange={(option) => {
							setSelectedStatus(option?.value || "")
							setBackendErrors((prev) => ({ ...prev, status: "" }))
							}}
							options={[
							{ value: "resolved", label: "✅ Resolved" },
							{ value: "false_alarm", label: "⚠️ False Alarm" },
							]}
							placeholder="Select new status..."
							className="w-full"
						/>
						</ThemeUI.FormField>
					</div>
					<div className="flex-2">
						<ThemeUI.FormField
						label="Reason"
						name="reason"
						error={backendErrors.reason}
						required={true}
						>
						<ThemeUI.Textarea
							id="companyAddress"
							name="companyAddress"
							rows="2"
							value={statusReason}
							onChange={(e) => {
							setStatusReason(e.target.value)
							setBackendErrors((prev) => ({ ...prev, reason: "" }))
							}}
							placeholder="Enter reason for status change..."
						/>
						</ThemeUI.FormField>
					</div>
					<div className="flex-shrink-0">
						<ThemeUI.Button
						onClick={handleStatusUpdate}
						disabled={
							!selectedStatus ||
							!statusReason.trim() ||
							statusUpdating
						}
						className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-6"
						>
						{statusUpdating ? (
							<>
							<Loader className="animate-spin mr-2" size={16} />
							Updating...
							</>
						) : (
							"Update Status"
						)}
						</ThemeUI.Button>
					</div>
					</div>
				</div>
				)}
				{/* Incident Location Section */}
				{sosDetails.user?.address && (
				<div className="border border-gray-200 rounded-lg p-4">
					<div className="flex items-center gap-2 mb-3">
					<h4 className="font-medium text-gray-900">
						Incident Location
					</h4>
					</div>
					<p className="text-sm text-gray-700">
					{sosDetails.user.address}
					</p>
					{sosDetails.user.latitude && sosDetails.user.longitude && (
					<p className="text-xs text-gray-500 mt-2 font-mono">
						{sosDetails.user.latitude}, {sosDetails.user.longitude}
					</p>
					)}
				</div>
				)}
			</div>
			)}
			{/* Ride Request Details */}
			{sosDetails.ride_request && (
			<div className="bg-white border border-gray-200 rounded-lg p-4">
				<h4 className="font-medium text-gray-900 mb-3">Ride Details</h4>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<p className="text-sm text-gray-500">Ride ID</p>
					<p className="text-sm font-medium">
					#{sosDetails.ride_request.id}
					</p>
				</div>
				<div>
					<p className="text-sm text-gray-500">Ride Status</p>
					<p className="text-sm font-medium capitalize">
					{sosDetails.ride_request.status}
					</p>
				</div>
				</div>
				{sosDetails.ride_request.pickup_address && (
				<div className="mt-3">
					<p className="text-sm text-gray-500">Pickup</p>
					<p className="text-sm text-gray-900">
					{sosDetails.ride_request.pickup_address}
					</p>
				</div>
				)}
				{sosDetails.ride_request.dropoff_address && (
				<div className="mt-3">
					<p className="text-sm text-gray-500">Dropoff</p>
					<p className="text-sm text-gray-900">
					{sosDetails.ride_request.dropoff_address}
					</p>
				</div>
				)}
			</div>
			)}
		</div>
		)
	}

	return (
		<Layout>
		<div className="flex items-center mb-4">
			<h1 className="text-2xl font-bold max-sm:text-xl flex-1">
			SOS Management
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
				SOS
				</li>
			</ol>
			</nav>
		</div>
		<div className="mb-4 rounded-lg w-full">
			<div className="flex  justify-between items-center gap-2">
			<div className="w-full max-sm:flex-1 sm:w-1/3">
				<ThemeUI.Input
				id="search"
				name="search"
				value={searchQuery}
				className="bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
				onChange={handleSearchChange}
				placeholder="Search by name..."
				leftElement={<Search size={16} className="text-gray-400" />}
				aria-label="Search SOS records"
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
				suppressSizeToFit: false,
			}}
			rowData={sos}
			rowHeight={55}
			columnDefs={columnDefs}
			pagination
			paginationPageSize={10}
			paginationPageSizeSelector={[10, 20, 50, 100]}
			paginationNumberFormatter={(params) => `${params.value}`}
			suppressCellFocus
			suppressPaginationPanel={false}
			noRowsOverlayComponent={NoRowsOverlay}
			noRowsOverlayComponentParams={{ text: "No SOS Found" }}
			onPaginationChanged={(params) => {
				if (params.api) {
				const newPage = params.api.paginationGetCurrentPage() + 1
				handlePageChange(newPage)
				}
			}}
			/>
		</div>
		<Modal
			isOpen={isModalOpen}
			onClose={handleCloseModal}
			title="View SOS Details"
			size="full"
		>
			{renderSosDetails()}
		</Modal>
		<Offcanvas
			isOpen={isFilterOffcanvasOpen}
			onClose={() => setIsFilterOffcanvasOpen(false)}
			title="Filter Options"
			position="right"
			size="md"
		>
			<div className="space-y-4">
			<ThemeUI.FormField label="Status Filter" error={backendErrors.status}>
				<ThemeUI.Select
				value={statusFilter}
				onChange={handleFilterChange}
				options={[
					{ value: "all", label: "All" },
					{ value: "logged", label: "Logged" },
					{ value: "resolved", label: "Resolved" },
					{ value: "false_alarm", label: "False Alarm" },
				]}
				placeholder="Filter by status"
				isClearable={true}
				aria-label="Filter SOS by status"
				/>
			</ThemeUI.FormField>
			</div>
		</Offcanvas>
		</Layout>
	)
}
export default Sos
