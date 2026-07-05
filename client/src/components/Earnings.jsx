import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Eye, CreditCard, Phone, Mail, Download } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import defaultProfileImage from "../assets/images/default-profile.png"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import * as XLSX from 'xlsx'

function Earnings() {
	const { theme } = useTheme()
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [earnings, setEarnings] = useState([])
	const [searchQuery, setSearchQuery] = useState("")
	const today = new Date().toISOString().split("T")[0]
	const [drivers, setDrivers] = useState([])
	const [states, setStates] = useState([])
	const [filters, setFilters] = useState({
		payment_status: "",
		date_from: today,
		date_to: today,
		pickup_state_id: "",
		dropoff_state_id: ""
	})
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [earningDetails, setEarningDetails] = useState(null)
	const [placeholder, setPlaceholder] = useState("Search by driver...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isLoadingDetails, setIsLoadingDetails] = useState(false)
	const words = ["driver", "fare"]

	// Initialize permissions with safe defaults
	const [earningsPermissions, setEarningsPermissions] = useState({
		can_add: false,
		can_edit: false,
		can_delete: false,
		can_view: false
	})

	// Get user permissions for the earnings module 
	const getUserPermissions = useCallback(() => {
		try {
			const permissionsStr = localStorage.getItem('userPermissions')
			if (permissionsStr) {
				const permissions = JSON.parse(permissionsStr)
				if (permissions.earnings) {
					return {
						can_add: permissions.earnings.can_add || false,
						can_edit: permissions.earnings.can_edit || false,
						can_delete: permissions.earnings.can_delete || false,
						can_view: permissions.earnings.can_view || false
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
		setEarningsPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setEarningsPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Memoized fetch function
	const fetchEarnings = useCallback(
		async (page, limit, search, filters) => {
			setIsLoading(true)
			try {
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/earnings`, {
					params: {
						page,
						limit,
						search,
						payment_status: filters.payment_status || "",
						date_from: filters.date_from || "",
						date_to: filters.date_to || "",
						pickup_state_id: filters.pickup_state_id || "",
						dropoff_state_id: filters.dropoff_state_id || ""
					},
				})
				if (response.data.success) {
					setEarnings(response.data.data.earnings || [])
					setTotalRows(response.data.data.pagination?.total_items || 0)
				} else {
					toast.error("Failed to fetch earnings")
					setEarnings([])
					setTotalRows(0)
				}
			} catch (err) {
				console.error("Error fetching earnings:", err)
				toast.error(err.response?.data?.message || "Failed to fetch earnings")
				setEarnings([])
				setTotalRows(0)
			} finally {
				setIsLoading(false)
			}
		},
		[]
	)

	// Fetch earnings on mount and when pagination/search/filters change
	useEffect(() => {
		fetchEarnings(currentPage, perPage, searchQuery, filters)
	}, [currentPage, perPage, searchQuery, filters, fetchEarnings])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime = 1500
		const timeout = setTimeout(() => {
			const currentWord = words[currentWordIndex]
			if (!isDeleting && currentCharIndex < currentWord.length) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex((prev) => prev + 1)
			} else if (isDeleting && currentCharIndex > 0) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex((prev) => prev - 1)
			} else if (!isDeleting && currentCharIndex === currentWord.length) {
				setTimeout(() => setIsDeleting(true), pauseTime)
			} else if (isDeleting && currentCharIndex === 0) {
				setIsDeleting(false)
				setCurrentWordIndex((prev) => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting, words])

	// Fetch drivers on mount for filter
	useEffect(() => {
		const fetchDrivers = async () => {
			try {
				const resp = await axios.get(`${import.meta.env.VITE_API_URL}/admin/drivers`)
				setDrivers(resp.data.data || [])
			} catch (err) {
				console.error("Failed to load drivers:", err)
				toast.error("Could not load drivers for filter")
			}
		}
		fetchDrivers()
	}, [])

	// Fetch states on mount
	useEffect(() => {
		const fetchStates = async () => {
			try {
				const resp = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicle-prices/states`)
				setStates(resp.data.data || [])
			} catch (err) {
				console.error("Failed to load states:", err)
				toast.error("Could not load states for filter")
			}
		}
		fetchStates()
	}, [])

	// Handle search
	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	// Handle filter change
	const handleFilterChange = (name, value) => {
		setFilters((prev) => ({ ...prev, [name]: value }))
		setCurrentPage(1)
	}

	// Handle pagination
	const handlePageChange = (page) => {
		setCurrentPage(page)
	}

	const handlePerRowsChange = (newPerPage, page) => {
		setPerPage(newPerPage)
		setCurrentPage(page)
	}

	// Handle view details
	const handleViewClick = useCallback((id) => {
		setIsModalOpen(true)
		fetchEarningDetails(id)
	}, [])

	// Handle cancel view
	const handleCancelEdit = () => {
		setIsModalOpen(false)
		setEarningDetails(null)
	}

	// Function to format status text
	const formatStatus = (status) => {
		if (!status) return "N/A"
		return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
	}

	// Function to format date and time
	const formatDateTime = (dateString) => {
		if (!dateString) return "N/A"
		const date = new Date(dateString)
		return date.toLocaleDateString("en-IN", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		})
	}

	// To Display complete earning details
	const fetchEarningDetails = async (id) => {
		setIsLoadingDetails(true)
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_URL}/admin/earnings/${id}`
			)
			if (response.data.success) {
				setEarningDetails(response.data.data)
			} else {
				toast.error("Failed to get earning details")
			}
		} catch (err) {
			console.error("Error retrieving earning details:", err)
			toast.error(err.response?.data?.message || "Failed to get earning details")
		} finally {
			setIsLoadingDetails(false)
		}
	}

	// Handle Excel Export
	const handleExcelExport = useCallback(() => {
		try {
			if (!earnings || earnings.length === 0) {
				toast.warning('No data to export')
				return
			}

			const exportData = earnings.map((earning, index) => ({
				'S.No': (currentPage - 1) * perPage + index + 1,
				'Earning ID': earning.id,
				'Passenger': earning.passenger?.name || 'N/A',
				'Driver': earning.driver?.name || 'N/A',
				'Vehicle Type': earning.vehicle_type?.name || 'N/A',
				'Final Fare': `₹${earning.fare_details?.final_fare || 0}`,
				'Commission Amount': `₹${earning.earnings?.commission_amount || 0}`,
				'Driver Payout': `₹${earning.earnings?.driver_payout || 0}`,
				'Tip Amount': `₹${earning.earnings?.tip_amount || 0}`,
				'Completed At': formatDateTime(earning.ride_completed_at),
				'Payment Status': formatStatus(earning.payment?.status),
			}));

			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.json_to_sheet(exportData);

			// Auto-fit columns (basic approach)
			const colWidths = exportData[0] ? Object.keys(exportData[0]).map(key => ({
				wch: Math.max(key.length, ...exportData.map(row => (row[key] || '').toString().length)) + 2
			})) : [];

			ws['!cols'] = colWidths;

			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(wb, ws, 'Earnings');

			// Generate filename with timestamp
			const timestamp = new Date().toISOString().split('T')[0];
			const filename = `earnings_${timestamp}.xlsx`;

			// Write file
			XLSX.writeFile(wb, filename);
			toast.success('Excel file exported successfully');
		} catch (error) {
			console.error('Error exporting to Excel:', error);
			toast.error('Failed to export Excel file');
		}
	}, [earnings, currentPage, perPage]);

	// DataTable columns - with conditional Actions column
	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName: "S.No",
				valueGetter: (params) =>
					(currentPage - 1) * perPage + params.node.rowIndex + 1,
				sortable: false,
				width: 80,
				suppressSizeToFit: true,
			},
			{
				headerName: "Passenger",
				field: "passenger.name",
				sortable: true,
				valueGetter: (params) => params.data.passenger?.name || "N/A",
				minWidth: 110,
				flex: 1,
			},
			{
				headerName: "Driver",
				field: "driver.name",
				sortable: true,
				valueGetter: (params) => params.data.driver?.name || "Not Assigned",
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Vehicle Type",
				field: "vehicle_type.name",
				sortable: true,
				valueGetter: (params) => params.data.vehicle_type?.name || "N/A",
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Final Fare",
				field: "fare_details.final_fare",
				sortable: true,
				valueGetter: (params) => `₹${params.data.fare_details?.final_fare || "0"}`,
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Commission",
				field: "earnings.commission_amount",
				sortable: true,
				valueGetter: (params) => `₹${params.data.earnings?.commission_amount || "0"}`,
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Driver Payout",
				field: "earnings.driver_payout",
				sortable: true,
				valueGetter: (params) => `₹${params.data.earnings?.driver_payout || "0"}`,
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Tip Amount",
				field: "earnings.tip_amount",
				sortable: true,
				valueGetter: (params) => `₹${params.data.earnings?.tip_amount || "0"}`,
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Completed At",
				field: "ride_completed_at",
				sortable: true,
				valueGetter: (params) => formatDateTime(params.data.ride_completed_at),
				minWidth: 150,
				flex: 1,
			},
			{
				headerName: "Payment Status",
				field: "payment.status",
				sortable: true,
				cellRenderer: (params) => (
					<span
						className={`px-2 py-1 rounded-full text-xs ${
							params.data.payment?.status === "paid"
								? "bg-green-100 text-green-800"
								: params.data.payment?.status === "refunded"
								? "bg-blue-100 text-blue-800"
								: "bg-yellow-100 text-yellow-800"
						}`}
					>
						{formatStatus(params.data.payment?.status)}
					</span>
				),
				minWidth: 120,
				flex: 1,
			},
		]
		// Only add Actions column if user has view permission
		if (earningsPermissions.can_view) {
			baseColumns.push({
				headerName: "Actions",
				field: "actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						<button
							onClick={() => handleViewClick(params.data.id)}
							className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
							title="View Details"
						>
							<Eye size={16} style={{ color: theme.primaryGradientStart }} />
						</button>
					</div>
				),
				minWidth: 100,
				flex: 0.5,
				sortable: false,
			})
		}
		return baseColumns
	}, [theme.primaryGradientStart, currentPage, perPage, earningsPermissions, handleViewClick])

	// Render complete earning details in a clean and organized way
	const renderEarningDetails = () => {
		if(isLoadingDetails){
			return (
				<div className="flex items-center justify-center py-8">
					<Loader className="animate-spin mr-2" size={20} />
					<span>Loading earning details...</span>
				</div>
			)
		}
		if(!earningDetails){
			return(
				<div className="text-center py-8 text-gray-500">
					No earning details available
				</div>
			)
		}
		const { 
			ride_info, 
			participants, 
			locations, 
			metrics, 
			fare_breakdown, 
			earnings_distribution, 
			payment,
			reservation_details 
		} = earningDetails
		return(
			<div className="space-y-6 p-2 max-h-[80vh] overflow-y-auto">
				{/* Header with Ride ID and Status */}
				<div className="border-gray-200 border-b pb-4">
					<div className="flex justify-between items-start flex-wrap gap-4">
						<div>
							<h2 className="text-2xl font-bold text-gray-800">
								Ride Earning #{ride_info?.id}
							</h2>
							<p className="text-gray-600 mt-1">
								{ride_info?.trip_type_label} • {participants?.vehicle_type?.name}
							</p>
							<p className="text-sm text-gray-500 mt-1">
								Completed: {formatDateTime(payment?.paid_at)}
							</p>
						</div>
						<div className="text-right space-y-2">
							<span
								className={`px-3 py-1 rounded-full text-sm font-medium ${
									payment?.status === "paid"
										? "bg-green-100 text-green-800"
										: payment?.status === "refunded"
										? "bg-blue-100 text-blue-800"
										: "bg-yellow-100 text-yellow-800"
								}`}
							>
								{formatStatus(payment?.status)}
							</span>
							<div className="text-sm text-gray-600">
								Payment: {payment?.method?.toUpperCase()}
							</div>
						</div>
					</div>
				</div>
				{/* Ride Information Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
						<p className="text-sm text-gray-600 font-medium mb-1">Trip Type</p>
						<p className="text-lg font-bold text-gray-900">{ride_info?.trip_type_label}</p>
						<p className="text-xs text-gray-600 mt-1">
							{ride_info?.is_interstate ? 'Interstate' : 'Intrastate'}
						</p>
					</div>
					<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
						<p className="text-sm text-gray-600 font-medium mb-1">Distance</p>
						<p className="text-lg font-bold text-gray-900">
							{metrics?.distance?.actual_km || '0'} km
						</p>
						<p className="text-xs text-gray-600 mt-1">
							Est: {metrics?.distance?.estimated_km || '0'} km
						</p>
					</div>
					<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
						<p className="text-sm text-gray-600 font-medium mb-1">Duration</p>
						<p className="text-lg font-bold text-gray-900">
							{metrics?.duration?.actual_minutes || '0'} min
						</p>
						<p className="text-xs text-gray-600 mt-1">
							Wait: {metrics?.duration?.waiting_time_minutes || '0'} min
						</p>
					</div>
				</div>
				{/* Participants Section */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Passenger Details */}
					<div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
						<h4 className="font-semibold text-gray-900 mb-4 flex items-center">
							<div className="w-8 h-8 rounded-full flex items-center justify-center mr-2" 
								style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
								<span className="text-white text-sm">P</span>
							</div>
							Passenger Details
						</h4>
						{participants?.passenger ? (
							<div className="space-y-3">
								<div className="flex items-center">
									<img
										src={defaultProfileImage}
										alt="Passenger"
										className="w-14 h-14 rounded-full mr-3 object-cover border-2 border-white shadow-sm"
									/>
									<div>
										<p className="font-semibold text-gray-900">{participants.passenger.name}</p>
										<p className="text-xs text-gray-500">Passenger ID: {participants.passenger.id}</p>
									</div>
								</div>
								<div className="space-y-2 p-3">
									<p className="flex items-center text-sm text-gray-700">
										<Phone size={14} className="mr-2 text-gray-500" />
										<span className="font-medium">{participants.passenger.mobile}</span>
									</p>
									<p className="flex items-center text-sm text-gray-700">
										<Mail size={14} className="mr-2 text-gray-500" />
										<span className="font-medium">{participants.passenger.email}</span>
									</p>
								</div>
								{participants?.rider_info && !participants.rider_info.is_booking_for_other && (
									<div className="bg-blue-50 rounded p-2 text-xs text-blue-700">
										Booking for self
									</div>
								)}
							</div>
						) : (
							<p className="text-gray-500">No passenger information</p>
						)}
					</div>
					{/* Driver Details */}
					<div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
						<h4 className="font-semibold text-gray-900 mb-4 flex items-center">
							<div className="w-8 h-8 rounded-full flex items-center justify-center mr-2" 
								style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
								<span className="text-white text-sm">D</span>
							</div>
							Driver Details
						</h4>
						{participants?.driver ? (
							<div className="space-y-3">
								<div className="flex items-center">
									<img
										src={defaultProfileImage}
										alt="Driver"
										className="w-14 h-14 rounded-full mr-3 object-cover border-2 border-white shadow-sm"
									/>
									<div>
										<p className="font-semibold text-gray-900">{participants.driver.name}</p>
										<p className="text-xs text-gray-500">Driver ID: {participants.driver.id}</p>
									</div>
								</div>
								<div className="space-y-2 p-3">
									<p className="flex items-center text-sm text-gray-700">
										<Phone size={14} className="mr-2 text-gray-500" />
										<span className="font-medium">{participants.driver.mobile}</span>
									</p>
									<p className="flex items-center text-sm text-gray-700">
										<Mail size={14} className="mr-2 text-gray-500" />
										<span className="font-medium">{participants.driver.email}</span>
									</p>
								</div>
								<div className="bg-green-50 rounded p-2 text-xs text-green-700">
									Vehicle: {participants?.vehicle_type?.name || 'N/A'}
								</div>
							</div>
						) : (
							<p className="text-gray-500">No driver assigned</p>
						)}
					</div>
				</div>
				{/* Locations Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-5">
					<h3 className="text-lg font-semibold mb-4 flex items-center">
						<div className="w-8 h-8 rounded-full flex items-center justify-center mr-2" 
							style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
							<span className="text-white text-xs">📍</span>
						</div>
						Trip Locations
					</h3>
					<div className="space-y-4">
						{/* Pickup */}
						<div className="bg-green-50 rounded-lg p-4 border border-green-100">
							<div className="flex items-start">
								<div className="flex-1">
									<p className="text-sm font-semibold text-green-800 mb-1">Pickup Location</p>
									<p className="text-sm text-gray-700">{locations?.pickup?.address}</p>
									<div className="flex gap-4 mt-2 text-xs text-gray-600">
										<span>District: {locations?.pickup?.district}</span>
										<span>State: {locations?.pickup?.state?.state_name}</span>
									</div>
								</div>
							</div>
						</div>
						{/* Dropoff */}
						<div className="bg-red-50 rounded-lg p-4 border border-red-100">
							<div className="flex items-start">
								<div className="flex-1">
									<p className="text-sm font-semibold text-red-800 mb-1">Dropoff Location</p>
									<p className="text-sm text-gray-700">{locations?.dropoff?.address}</p>
									<div className="flex gap-4 mt-2 text-xs text-gray-600">
										<span>District: {locations?.dropoff?.district}</span>
										<span>State: {locations?.dropoff?.state?.state_name}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				{/* Fare Breakdown Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-5">
					<h3 className="text-lg font-semibold mb-4 flex items-center">
						<CreditCard className="mr-2" size={20} style={{ color: theme.primaryGradientStart }} />
						Complete Fare Breakdown
					</h3>
					{/* Fare Components */}
					<div className="space-y-2 mb-4">
						<p className="text-sm font-medium text-gray-700 mb-2">Fare Components</p>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">Base Fare:</span>
							<span className="font-medium">₹{fare_breakdown?.components?.base_fare || "0"}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">Distance Charge:</span>
							<span className="font-medium">₹{fare_breakdown?.components?.distance_charge || "0"}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">Waiting Charge:</span>
							<span className="font-medium">₹{fare_breakdown?.components?.waiting_charge || "0"}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">Bata Charge:</span>
							<span className="font-medium">₹{fare_breakdown?.components?.bata_charge || "0"}</span>
						</div>
						<div className="flex justify-between text-sm pt-2 border-t border-gray-200">
							<span className="text-gray-700 font-medium">Subtotal:</span>
							<span className="font-semibold">₹{fare_breakdown?.components?.subtotal || "0"}</span>
						</div>
					</div>
					{/* GST Breakdown */}
					<div className="space-y-2 mb-4 bg-gray-50 rounded-lg p-3">
						<p className="text-sm font-medium text-gray-700 mb-2">
							GST ({fare_breakdown?.gst?.is_interstate ? 'Interstate - IGST' : 'Intrastate - CGST + SGST'})
						</p>
						{fare_breakdown?.gst?.breakdown && (
							<>
								{fare_breakdown.gst.breakdown.igst !== undefined && (
									<div className="flex justify-between text-sm">
										<span className="text-gray-600">IGST:</span>
										<span className="font-medium">₹{fare_breakdown.gst.breakdown.igst || "0"}</span>
									</div>
								)}
								{fare_breakdown.gst.breakdown.cgst !== undefined && (
									<div className="flex justify-between text-sm">
										<span className="text-gray-600">CGST:</span>
										<span className="font-medium">₹{fare_breakdown.gst.breakdown.cgst || "0"}</span>
									</div>
								)}
								{fare_breakdown.gst.breakdown.sgst !== undefined && (
									<div className="flex justify-between text-sm">
										<span className="text-gray-600">SGST:</span>
										<span className="font-medium">₹{fare_breakdown.gst.breakdown.sgst || "0"}</span>
									</div>
								)}
							</>
						)}
						<div className="flex justify-between text-sm pt-2 border-t border-gray-300">
							<span className="text-gray-700 font-medium">Total GST:</span>
							<span className="font-semibold">₹{fare_breakdown?.gst?.total_gst || "0"}</span>
						</div>
					</div>
					{/* Discount */}
					{parseFloat(fare_breakdown?.discount?.amount || 0) > 0 && (
						<div className="bg-green-50 rounded-lg p-3 mb-4 border border-green-100">
							<div className="flex justify-between items-center">
								<div>
									<p className="text-sm font-medium text-green-800">Discount Applied</p>
									{fare_breakdown?.discount?.coupon && (
										<p className="text-xs text-green-600 mt-1">
											Coupon: {fare_breakdown.discount.coupon.code} ({fare_breakdown.discount.coupon.type})
										</p>
									)}
								</div>
								<span className="font-bold text-green-700">-₹{fare_breakdown?.discount?.amount || "0"}</span>
							</div>
						</div>
					)}
					{/* Final Fare */}
					<div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200">
						<div className="flex justify-between items-center">
							<span className="text-lg font-bold text-gray-800">Final Fare</span>
							<span className="text-2xl font-bold" style={{ color: theme.primaryGradientStart }}>
								₹{fare_breakdown?.final_fare || "0"}
							</span>
						</div>
					</div>
				</div>
				{/* Earnings Distribution */}
				<div className="bg-white border border-gray-200 rounded-lg p-5">
					<h3 className="text-lg font-semibold mb-4 flex items-center">
						<div className="w-8 h-8 rounded-full flex items-center justify-center mr-2" 
							style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
							<span className="text-white text-xs">💰</span>
						</div>
						Earnings Distribution
					</h3>
					<div className="space-y-4">
						{/* Commission */}
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<div className="flex justify-between items-center">
								<div>
									<p className="text-sm font-medium text-gray-800">Platform Commission</p>
									<p className="text-xs text-gray-600 mt-1">
										{earnings_distribution?.commission?.percentage || "0"}% of final fare
									</p>
								</div>
								<span className="text-xl font-bold text-gray-700">
									₹{earnings_distribution?.commission?.amount || "0"}
								</span>
							</div>
						</div>
						{/* Driver Earnings */}
						<div className="bg-green-50 rounded-lg p-4 border border-green-100">
							<p className="text-sm font-medium text-green-800 mb-3">Driver Earnings</p>
							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-gray-600">Base Payout:</span>
									<span className="font-medium">₹{earnings_distribution?.driver?.base_payout || "0"}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-gray-600">Tip Amount:</span>
									<span className="font-medium">₹{earnings_distribution?.driver?.tip_amount || "0"}</span>
								</div>
								<div className="flex justify-between pt-2 border-t border-green-200">
									<span className="font-semibold text-green-800">Total Driver Earnings:</span>
									<span className="text-xl font-bold text-green-700">
										₹{earnings_distribution?.driver?.total_earnings || "0"}
									</span>
								</div>
							</div>
						</div>
						{/* Calculation Formula */}
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
							<p className="text-xs font-medium text-gray-700 mb-2">Calculation Formulas</p>
							<div className="space-y-1 text-xs text-gray-600">
								<p>• {earnings_distribution?.formula?.commission_amount}</p>
								<p>• {earnings_distribution?.formula?.driver_payout}</p>
								<p>• {earnings_distribution?.formula?.total_driver_earnings}</p>
							</div>
						</div>
					</div>
				</div>
				{/* Reservation Details (if applicable) */}
				{reservation_details && (
					<div className="bg-white border border-gray-200 rounded-lg p-5">
						<h3 className="text-lg font-semibold mb-4 flex items-center">
							<div className="w-8 h-8 rounded-full flex items-center justify-center mr-2" 
								style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
								<span className="text-white text-xs">📦</span>
							</div>
							Package & Reservation Details
						</h3>
						<div className="space-y-3">
							<div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
								<p className="text-sm font-medium text-blue-800">
									Package: {reservation_details.package?.name || 'N/A'}
								</p>
							</div>
							{reservation_details.is_custom_trip && reservation_details.custom_details && (
								<div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
									<p className="text-sm font-medium text-purple-800 mb-2">Custom Trip</p>
									<div className="grid grid-cols-2 gap-2 text-xs">
										<div>
											<span className="text-purple-600">Kilometers:</span>
											<span className="font-medium ml-2">{reservation_details.custom_details.kilometers} km</span>
										</div>
										<div>
											<span className="text-purple-600">Days:</span>
											<span className="font-medium ml-2">{reservation_details.custom_details.days}</span>
										</div>
									</div>
								</div>
							)}
							{reservation_details.advance_payment?.is_advance_paid && (
								<div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
									<p className="text-sm font-medium text-yellow-800 mb-2">Advance Payment</p>
									<div className="space-y-1 text-xs">
										<div className="flex justify-between">
											<span className="text-yellow-600">Advance Paid:</span>
											<span className="font-medium">₹{reservation_details.advance_payment.advance_amount || "0"}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-yellow-600">Remaining:</span>
											<span className="font-medium">₹{reservation_details.advance_payment.remaining_amount || "0"}</span>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
				{/* Close Button */}
				<div className="flex justify-end gap-3 pt-4 border-gray-200 border-t sticky bottom-0 bg-white">
					<ThemeUI.Button
						type="button"
						onClick={handleCancelEdit}
						gradientColors={{
							start: theme.primaryGradientStart,
							end: theme.primaryGradientEnd,
						}}
					>
						Close
					</ThemeUI.Button>
				</div>
			</div>
		)
	}

	return (
		<Layout>
			{/* Header and breadcrumb */}
			<div className="flex flex-row items-center mb-4">
				<h1 className="text-2xl flex-1 font-bold max-sm:text-xl">
					Earnings Overview
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
							Earnings
						</li>
					</ol>
				</nav>
			</div>
			{/* Payment Status Tabs */}
			<div className="mb-4 space-y-3">
				<div className="flex justify-center">
					<div className="inline-flex rounded-md shadow-sm" role="group">
						{[
							{ value: "all", label: "All", isFirst: true },
							{ value: "paid", label: "Paid" },
							{ value: "refunded", label: "Refunded", isLast: true },
						].map(({ value, label, isFirst, isLast }) => (
							<button
								key={value}
								type="button"
								className={`px-4 py-2 text-sm font-medium flex items-center transition-all duration-200 ${
									isFirst ? "rounded-l-md" : isLast ? "rounded-r-md" : "border-r"
								} ${
									(filters.payment_status === value || (!filters.payment_status && value === "all"))
										? "text-white border-transparent"
										: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
								}`}
								style={
									(filters.payment_status === value || (!filters.payment_status && value === "all"))
										? { background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }
										: {}
								}
								onClick={() => handleFilterChange("payment_status", value === "all" ? "" : value)}
							>
								{label}
							</button>
						))}
					</div>
				</div>
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
							onClick={handleExcelExport}
							gradientColors={{
								start: theme.secondaryGradientStart,
								end: theme.secondaryGradientEnd,
							}}
							direction={theme.gradientDirection}
							aria-label="Export to Excel"
						>
							<Download size={16} className="mr-2" /> Export Excel
						</ThemeUI.Button>
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
			{/* DataTable with horizontal scroll wrapper */}
			<div style={{
				"--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
			}}
			>
				<AgGridReact
					className="custom-ag-grid"
					domLayout="autoHeight"
					animateRows={true}
                    theme={themeQuartz.withParams({
                        spacing: 7,
                        headerHeight: 45,
                        headerFontSize: 16,
                        fontSize: 13,
                        headerTextColor: "white",
                        paginationPanelHeight: 50,
                    })}
					defaultColDef={{
						resizable: true,
						suppressSizeToFit: true,
					}}
					rowData={earnings}
					columnDefs={columnDefs}
					pagination={true}
					paginationPageSize={perPage}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					cacheBlockSize={perPage}
					paginationNumberFormatter={(params) => Math.floor(params.value) + 1}
					suppressPaginationPanel={false}
					loadingOverlayComponent={Loader}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Earnings Found" }}
					onPaginationChanged={(params) => {
						if (params.api) {
							const newPage = params.api.paginationGetCurrentPage() + 1
							if (newPage !== currentPage) {
								handlePageChange(newPage)
							}
						}
					}}
				/>
			</div>
			{/* Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCancelEdit}
				title="View Earning Details"
				size="full"
			>
				{renderEarningDetails()}
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
					<ThemeUI.FormField label="Payment Status">
						<ThemeUI.Select
							value={filters.payment_status}
							onChange={(selected) =>
								handleFilterChange("payment_status", selected?.value || "")
							}
							options={[
								{ value: "paid", label: "Paid" },
								{ value: "refunded", label: "Refunded" },
							]}
							placeholder="Filter by payment status"
							isClearable
							isSearchable={false}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Pickup State">
						<ThemeUI.Select
							value={filters.pickup_state_id}
							onChange={(selected) =>
								handleFilterChange("pickup_state_id", selected?.value || "")
							}
							options={states.map((s) => ({
								value: s.id.toString(),
								label: s.state_name
							}))}
							placeholder="Select pickup state"
							isClearable
							isSearchable={false}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Dropoff State">
						<ThemeUI.Select
							value={filters.dropoff_state_id}
							onChange={(selected) =>
								handleFilterChange("dropoff_state_id", selected?.value || "")
							}
							options={states.map((s) => ({
								value: s.id.toString(),
								label: s.state_name
							}))}
							placeholder="Select dropoff state"
							isClearable
							isSearchable={false}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Date From">
						<ThemeUI.Input
							type="date"
							value={filters.date_from}
							onChange={(e) => handleFilterChange("date_from", e.target.value)}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Date To">
						<ThemeUI.Input
							type="date"
							value={filters.date_to}
							onChange={(e) => handleFilterChange("date_to", e.target.value)}
						/>
					</ThemeUI.FormField>
					<div className="flex gap-2">
						<ThemeUI.Button
							type="button"
							onClick={() => {
								setFilters({
									payment_status: "",
									date_from: "",
									date_to: "",
									pickup_state_id: "",
									dropoff_state_id: ""
								})
								setCurrentPage(1)
								setIsFilterOffcanvasOpen(false)
							}}
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

export default Earnings