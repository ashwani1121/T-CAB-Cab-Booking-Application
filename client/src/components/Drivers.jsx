import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, ZoomIn } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import Lightbox from "yet-another-react-lightbox"
import "yet-another-react-lightbox/styles.css"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
function Drivers(){
	const { theme } 											= useTheme()
	const [placeholder, setPlaceholder] 						= useState("")
	const [currentWordIndex, setCurrentWordIndex] 				= useState(0)
	const [currentCharIndex, setCurrentCharIndex] 				= useState(0)
	const [isDeleting, setIsDeleting]						 	= useState(false)
	const words 												= ["name", "email", "mobile"]
	const [drivers, setDrivers] 								= useState([])
	const [isLoading, setIsLoading] 							= useState(false)
	const [totalRows, setTotalRows] 							= useState(0)
	const [perPage, setPerPage] 								= useState(10)
	const [currentPage, setCurrentPage] 						= useState(1)
	const [editingDriver, setEditingDriver] 					= useState(null)
	const [isModalOpen, setIsModalOpen] 						= useState(false)
	const [activeTab, setActiveTab] 							= useState("personal")
	const [backendErrors, setBackendErrors] 					= useState({})
	const [isSaving, setIsSaving] 								= useState(false)
	const [formData, setFormData] 								= useState({
		verification_status: "pending",
		driver_type:"",
		reason: "",
		user_status:""
	})
	const [searchQuery, setSearchQuery] 						= useState("")
	const [statusFilter, setStatusFilter] 						= useState("all")
	const [depositStatusFilter, setDepositStatusFilter] 		= useState("all")
	const [accountStatusFilter, setAccountStatusFilter] 	    = useState("all")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] 	= useState(false)
	const [isLightboxOpen, setIsLightboxOpen] 					= useState(false)
	const [lightboxImages, setLightboxImages] 					= useState([])
	const [lightboxIndex, setLightboxIndex] 					= useState(0)
	const [windowWidth, setWindowWidth] 						= useState(
		typeof window !== "undefined" ? window.innerWidth : 1200
	)
	const [isMobile, setIsMobile] 								= useState(false)
	const [isTablet, setIsTablet] 								= useState(false)

	// Initialize permissions with safe defaults
	const [driversPermissions, setDriversPermissions]         = useState({
		can_add                                                 : false,
		can_edit                                                : false,
		can_delete                                              : false,
		can_view                                                : false
	})

	// Get user permissions for the drivers module 
	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.drivers){
					return {
						can_add     : permissions.drivers.can_add || false,
						can_edit    : permissions.drivers.can_edit || false,
						can_delete  : permissions.drivers.can_delete || false,
						can_view    : permissions.drivers.can_view || false
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
		setDriversPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setDriversPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed  = isDeleting ? 50 : 100
		const pauseTime    = 1500
		const timeout      = setTimeout(() => {
		const currentWord  = words[currentWordIndex]
			if(!isDeleting && currentCharIndex < currentWord.length){ 
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex((prev) => prev + 1)
			}else
			if(isDeleting && currentCharIndex > 0){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex((prev) => prev - 1)
			}else 
			if(!isDeleting && currentCharIndex === currentWord.length){
				setTimeout(() => setIsDeleting(true), pauseTime)
			}else 
			if(isDeleting && currentCharIndex === 0){
				setIsDeleting(false)
				setCurrentWordIndex((prev) => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting, words])

	// Fetch drivers with pagination, search, and filters
	const fetchDrivers = useCallback(
		async(page, rowsPerPage, search, status, depositStatus, accountStatus) => {
			setIsLoading(true)
			try{
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/drivers`,{
					params: {
						page,
						limit: rowsPerPage,
						search: search || "",
						status: status === "all" ? "" : status,
						deposit_status: depositStatus === "all" ? "" : depositStatus,
						account_status: accountStatus === "all" ? "" : accountStatus, // NEW LINE
					},
				})
				setDrivers(response.data.data.drivers || [])
				setTotalRows(response.data.data.pagination.total_records || 0)
			}catch(err){
				toast.error("Failed to fetch drivers")
				console.error("fetchDrivers error:", err)
			}finally{
				setIsLoading(false)
			}
		},
		[]
	)

	// Dynamic resize handler
	useEffect(() => {
		const handleResize = () => {
			const width = window.innerWidth
			setWindowWidth(width)
			setIsMobile(width < 768)
			setIsTablet(width >= 768 && width < 1024)
		}
		handleResize()
		window.addEventListener("resize", handleResize)
		return () => window.removeEventListener("resize", handleResize)
	}, [])

	// Debounced fetch with filters
	useEffect(() => {
		const handler = setTimeout(() => {
			fetchDrivers(
				currentPage,
				perPage,
				searchQuery,
				statusFilter,
				depositStatusFilter,
				accountStatusFilter  
			)
		}, 300)
		return () => clearTimeout(handler)
	}, [
		currentPage,
		perPage,
		searchQuery,
		statusFilter,
		depositStatusFilter,
		accountStatusFilter, 
		fetchDrivers,
	])

	// Fetch single driver details
	const fetchDriverDetails = async (driverId) => {
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/drivers/${driverId}`)
			return response.data.data
		}catch(err){
			toast.error("Failed to fetch driver details")
			console.error("fetchDriverDetails error:", err)
			return null
		}
	}

	const handleEditClick = async (driver) => {
		setIsLoading(true)
		const driverDetails = await fetchDriverDetails(driver.id)
		if(driverDetails){
			setEditingDriver(driverDetails)
			setFormData({
				verification_status: driverDetails.driver_details?.status || "pending",
				driver_type:driverDetails.driver_details?.driver_type,
				reason: driverDetails.driver_details?.reason || "",
				user_status: driverDetails?.status || 1
			})
		}else{
			setEditingDriver(driver)
			setFormData({
				verification_status: driver.driver_details?.status || "pending",
				driver_type:driverDetails.driver_details?.driver_type,
				reason: driver.driver_details?.reason || "",
				user_status: driverDetails?.status || 1
			})
		}
		setBackendErrors({})
		setActiveTab("personal")
		setIsModalOpen(true)
		setIsLoading(false)
	}

	const handleCancelEdit = () => {
		setEditingDriver(null)
		setFormData({ 
			verification_status: "pending", 
			driver_type: "", 
			reason: "", 
			user_status: 1 
		})
		setBackendErrors({})
		setIsModalOpen(false)
	}

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData((prev) => ({ ...prev, [name]: value }))
		if (backendErrors[name]) {
		setBackendErrors((prev) => ({ ...prev, [name]: "" }))
		}
	}

	const handleImageClick = useCallback((imageSrc, allImages, currentIndex) => {
		const formattedImages = allImages.map((img) => ({
		src: img.src,
		alt: img.alt || "Document Image",
		}))
		setLightboxImages(formattedImages)
		setLightboxIndex(currentIndex)
		setIsLightboxOpen(true)
	}, [])

	const handleSaveStatus = async () => {
		if (!editingDriver) return
		setIsSaving(true)
		setBackendErrors({})
		try {
		const response = await axios.put(
			`${import.meta.env.VITE_API_URL}/admin/drivers/${
			editingDriver.id
			}/status`,
			{
			verification_status: formData.verification_status,
			driver_type:formData.driver_type,
			reason: formData.reason,
			status: parseInt(formData.user_status)
			}
		)
		if (response.data.success) {
			toast.success("Driver status updated successfully")
			handleCancelEdit()
			fetchDrivers(
			currentPage,
			perPage,
			searchQuery,
			statusFilter,
			depositStatusFilter,
			accountStatusFilter
			)
		}
		} catch (err) {
		if (err.response?.data?.errors) {
			setBackendErrors(err.response.data.errors)
		} else {
			toast.error("Failed to update driver status")
		}
		console.error("handleSaveStatus error:", err)
		} finally {
		setIsSaving(false)
		}
	}

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	const handleStatusFilterChange = (selected) => {
		setStatusFilter(selected.value)
		setCurrentPage(1)
	}

	const handleDepositStatusFilterChange = (selected) => {
		setDepositStatusFilter(selected.value)
		setCurrentPage(1)
	}

	const handleAccountStatusFilterChange = (selected) => {
		setAccountStatusFilter(selected.value)
		setCurrentPage(1)
	}

	const handlePageChange = (page) => {
		setCurrentPage(page)
	}

	const handlePerRowsChange = (newPerPage) => {
		setPerPage(newPerPage)
		setCurrentPage(1)
	}

	const formatRegistrationDate = (dateString) => {
		if (!dateString) return "N/A"
		try {
		const date = new Date(dateString)
		const now = new Date()
		const diffInHours = Math.abs(now - date) / (1000 * 60 * 60)
		if (diffInHours < 24) {
			return formatDistanceToNow(date, { addSuffix: true })
		}
		return format(date, "MMM dd, yyyy HH:mm")
		} catch (error) {
		return dateString
		}
	}

	// Status Badge Component
	const StatusBadge = ({ status, type = "default" }) => {
		const getStatusConfig = (status, type) => {
			const statusKey   = status !== null && status !== undefined ? String(status).toLowerCase() : 'pending';
			const configs     = {
				status : {
					'1': {
						bg: "bg-emerald-50",
						text: "text-emerald-700",
						border: "border-emerald-200",
						icon: "✓",
						label: "Active"
					},
					'0': {
						bg: "bg-red-50",
						text: "text-red-700",
						border: "border-red-200",
						icon: "✕",
						label: "Inactive"
					},
				},
				deposit: {
					paid: {
						bg: "bg-emerald-50",
						text: "text-emerald-700",
						border: "border-emerald-200",
						icon: "✓",
						label: "Paid"
					},
					failed: {
						bg: "bg-red-50",
						text: "text-red-700",
						border: "border-red-200",
						icon: "✕",
						label: "Failed"
					},
					pending: {
						bg: "bg-amber-50",
						text: "text-amber-700",
						border: "border-amber-200",
						icon: "⏳",
						label: "Pending"
					},
				},
				verify: {
					approved: {
						bg: "bg-emerald-50",
						text: "text-emerald-700",
						border: "border-emerald-200",
						icon: "✓",
						label: "Approved"
					},
					rejected: {
						bg: "bg-red-50",
						text: "text-red-700",
						border: "border-red-200",
						icon: "✕",
						label: "Rejected"
					},
					suspended: {
						bg: "bg-slate-50",
						text: "text-slate-700",
						border: "border-slate-200",
						icon: "⏸",
						label: "Suspended"
					},
					pending: {
						bg: "bg-amber-50",
						text: "text-amber-700",
						border: "border-amber-200",
						icon: "⏳",
						label: "Pending"
					},
				},
			}
			const config = configs[type]?.[statusKey] || configs[type]?.pending || {
				bg: "bg-slate-50",
				text: "text-slate-700",
				border: "border-slate-200",
				icon: "?",
				label: "Unknown"
			};
			return config;
		}
		const config 	  = getStatusConfig(status, type)
		const displayText = config.label || (status !== null && status !== undefined ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : "Pending");
		return(
			<div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
							${config.bg} ${config.text} ${config.border} shadow-sm transition-all duration-200 hover:shadow-md`}
			>
				<span className="select-none text-xs">{config.icon}</span>
				<span className="select-none">{displayText}</span>
			</div>
		)
	}

	// DataTable columns - with conditional Actions column
	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName  : "S. No.",
				valueGetter : (params) => (currentPage - 1) * perPage + params.node.rowIndex + 1,
				sortable    : false,
				width       : 100,
			},
			{
				headerName  : "Name",
				field       : "name",
				sortable    : true,
				suppressSizeToFit : true,
				minWidth    : 120,
				flex        : 1.5,
			},
			{
				headerName      : "Email",
				field           : "email",
				sortable        : true,
				minWidth        : 200,
				flex            : 1.5,
			},
			{
				headerName      : "Mobile",
				field           : "mobile",
				sortable        : true,
				minWidth        : 120,
				flex            : 1,
			},
			{
				headerName: "Verification Status",  
				field: "verify_sts",
				cellRenderer: (params) => (
					<StatusBadge status={params.data.verify_sts} type="verify" />
				),
				minWidth: 150,
				flex: 1,
			},
			{
				headerName      : "Deposit Status",
				field           : "deposit_sts",
				cellRenderer    : (params) => (
					<StatusBadge status={params.data.deposit_sts} type="deposit" />
				),
				minWidth        : 150,
				flex            : 0.9,
			},
			{
				headerName      : "Status",
				field           : "status",
				cellRenderer        : (params) => (
					<StatusBadge status={params.data.status} type="status" />
				),
				minWidth        : 150,
				flex            : 1,
			},
			{
				headerName      : "Registered",
				field           : "created_At",
				sortable        : true,
				cellRenderer    : (params) => (
					<div className="text-xs space-y-1">
						<div className="text-gray-900 font-medium">
							{formatRegistrationDate(params.data.created_at)}
						</div>
						<div className="text-gray-500">
							{format(new Date(params.data.created_at), "MMM dd, yyyy")}
						</div>
					</div>
				),
				minWidth        : 150,
				flex            : 0.9,
			},
		]
		// Only add Actions column if user has edit or delete permission
		if(driversPermissions.can_edit || driversPermissions.can_delete){
			baseColumns.push({
				headerName  : "Actions",
				field       : "actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						{driversPermissions.can_edit && (
							<button
								onClick   = {() => handleEditClick(params.data)}
								className = "p-1 text-blue-600 hover:text-blue-800 transition-colors"
								title     = "Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
					</div>
				),
				minWidth    : 100,
				flex        : 0.5,
				sortable    : false,
			})
		}
		return baseColumns
	}, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, driversPermissions, handleEditClick])

	// Memoized DocumentImage Component
	const DocumentImage = React.memo(
		({ src, alt, onClick, index, documentImages }) => {
		if (!src) {
			return (
			<div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
				<span className="text-gray-500 text-sm">No image</span>
			</div>
			)
		}
		return (
			<div className="group">
			<div className="relative overflow-hidden rounded-lg shadow-sm">
				<img
				src={src}
				alt={alt}
				className="w-full h-32 object-cover cursor-pointer transition-all duration-300 group-hover:scale-105"
				onClick={() => onClick && onClick(src, documentImages, index)}
				onError={(e) => {
					e.target.src =
					"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NS4zMzMzIDY0TDk2IDc0LjY2NjdMMTA2LjY2NyA2NEwxMTcuMzMzIDc0LjY2NjciIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHA+SW1hZ2UgTm90IEZvdW5kPC9wPgo8L3N2Zz4K"
					e.target.classList.add("object-contain")
				}}
				/>
				<div
				onClick={() => onClick && onClick(src, documentImages, index)}
				className="absolute inset-0 bg-transparent hover:bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center"
				>
				<ZoomIn
					className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
					size={24}
				/>
				</div>
			</div>
			</div>
		)
		}
	)
	const renderPersonalDetails = useCallback(() => {
		if (!editingDriver) return null
		const { driver_details } = editingDriver
		// Helper function to create image URL
		const createImageUrl = (path, filename) => {
		if (!filename) return null
		return `${import.meta.env.VITE_API_URL}${path}${filename}`
		}
		// Driver photo for lightbox
		const driverPhotoSrc = createImageUrl(
		"/uploads/drivers/photos/",
		editingDriver?.profile
		)
		return (
		<div className="space-y-6 md:space-y-8">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
				{/* Basic Information */}
				<div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
					<div className="flex items-center mb-4 md:mb-6">
						<div className="w-2 h-6 bg-blue-500 rounded-full mr-3"></div>
						<h3 className="text-base md:text-lg font-semibold text-gray-900">
							Basic Information
						</h3>
					</div>
					<div className="flex flex-col sm:flex-row gap-4 md:gap-6">
						{/* Driver Photo */}
						<div className="flex-shrink-0 self-center sm:self-start">
							<div className="relative group">
								<div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg mx-auto sm:mx-0 bg-white">
									{driverPhotoSrc ? (
									<img
										src={driverPhotoSrc}
										alt="Driver Photo"
										className="w-full h-full object-cover cursor-pointer transition-all duration-300 group-hover:scale-110"
										onClick={() =>
										handleImageClick(
											driverPhotoSrc,
											[{ src: driverPhotoSrc, alt: "Driver Photo" }],
											0
										)
										}
										onError={(e) => {
										e.target.src =
											"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00OCA0OEM1My41MjI4IDQ4IDU4IDQzLjUyMjggNTggMzhDNTggMzIuNDc3MiA1My41MjI4IDI4IDQ4IDI4QzQyLjQ3NzIgMjggMzggMzIuNDc3MiAzOCAzOEMzOCA0My41MjI4IDQyLjQ3NzIgNDggNDggNDhaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yOCA2OEMyOCA2MC4yNjggMzQuMjY4IDU0IDQyIDU0SDU0QzYxLjczMiA1NCA2OCA2MC4yNjggNjggNjhWNzJIMjhWNjhaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo="
										e.target.classList.add(
											"object-contain",
											"bg-gray-200"
										)
										}}
										loading="lazy"
									/>
									) : (
									<div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-full">
										<svg
										className="w-6 h-6 md:w-8 md:h-8 text-gray-400"
										fill="currentColor"
										viewBox="0 0 24 24"
										>
											<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
										</svg>
									</div>
									)}
								</div>
								{driverPhotoSrc && (
									<div
									className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center rounded-full"
									onClick={() =>
										handleImageClick(
										driverPhotoSrc,
										[{ src: driverPhotoSrc, alt: "Driver Photo" }],
										0
										)
									}
									>
									<ZoomIn
										className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
										size={16}
									/>
									</div>
								)}
							</div>
						</div>
						{/* Basic Details */}
						<div className="flex-1 min-w-0">
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
								<div className="min-w-0">
									<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
										Name
									</dt>
									<dd className="text-sm md:text-base text-gray-900 font-medium truncate">
										{editingDriver.name}
									</dd>
								</div>
								<div className="min-w-0 sm:col-span-2 lg:col-span-1 xl:col-span-2">
									<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
										Email
									</dt>
									<dd className="text-sm md:text-base text-gray-900 break-all">
										{editingDriver.email}
									</dd>
								</div>
								<div className="min-w-0">
									<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
										Gender
									</dt>
									<dd className="text-sm md:text-base text-gray-900 capitalize">
										{editingDriver.gender}
									</dd>
								</div>
								<div className="min-w-0">
									<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
										Date of Birth
									</dt>
									<dd className="text-sm md:text-base text-gray-900">
										{driver_details?.dob || "Not provided"}
									</dd>
								</div>
								<div className="min-w-0">
									<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
										Mobile Code
									</dt>
									<dd className="text-sm md:text-base text-gray-900">
										{driver_details?.mobile_code || "Not provided"}
									</dd>
								</div>
								<div className="min-w-0">
									<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
										Mobile
									</dt>
									<dd className="text-sm md:text-base text-gray-900 font-mono">
										{editingDriver.mobile}
									</dd>
								</div>
							</div>
						</div>
					</div>
				</div>
				{/* Documents & Current Status */}
				<div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
					<div className="flex items-center mb-4 md:mb-6">
					<div className="w-2 h-6 bg-green-500 rounded-full mr-3"></div>
					<h3 className="text-base md:text-lg font-semibold text-gray-900">
						Documents & Current Status
					</h3>
					</div>
					<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
						<div className="min-w-0">
						<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
							Aadhar Number
						</dt>
						<dd className="text-sm md:text-base text-gray-900 font-mono break-all">
							{driver_details?.aadhar_no || "Not provided"}
						</dd>
						</div>
						<div className="min-w-0">
						<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
							License Number
						</dt>
						<dd className="text-sm md:text-base text-gray-900 font-mono break-all">
							{driver_details?.license_number || "Not provided"}
						</dd>
						</div>
						<div className="min-w-0">
						<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
							Vehicle RC Number
						</dt>
						<dd className="text-sm md:text-base text-gray-900 font-mono break-all">
							{driver_details?.vehicle_rc_no || "Not provided"}
						</dd>
						</div>
						<div className="min-w-0">
						<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
							Verification Status
						</dt>
						<dd>
							<StatusBadge status={driver_details?.status || editingDriver.status} type="verify"/>
						</dd>
						</div>
						<div className="min-w-0">
						<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
							Deposit Status
						</dt>
						<dd>
							<StatusBadge status={driver_details?.deposit_status || editingDriver.deposit_sts} type="deposit"/>
						</dd>
						</div>
						{driver_details?.reason && (
						<div className="min-w-0 sm:col-span-2 xl:col-span-1">
							<dt className="text-xs md:text-sm font-medium text-gray-600 mb-1">
							Status Reason
							</dt>
							<dd className="text-sm md:text-base text-gray-900 line-clamp-2">
							{driver_details.reason}
							</dd>
						</div>
						)}
					</div>
					</div>
				</div>
			</div>
			{/* Status Update Form - Editable Section */}
			<div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm">
				<div className="flex items-center mb-4 md:mb-6">
					<div className="w-2 h-6 bg-orange-500 rounded-full mr-3"></div>
					<h3 className="text-base md:text-lg font-semibold text-gray-900">
						Update Driver Status & Type
					</h3>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
					{/* Driver Type Field */}
					<ThemeUI.FormField
						label="Driver Type"
						name="driver_type"
						error={backendErrors.driver_type}
						required
					>
						<ThemeUI.Select
							id="driver_type"
							name="driver_type"
							value={formData.driver_type}
							onChange={(selected) =>
								handleInputChange({
									target: { name: "driver_type", value: selected.value },
								})
							}
							options={[
								{ value: "nefa_driver", label: "🚗 Nefa Driver" },
								{ value: "registered_driver", label: "👤 TiedUp Driver" },
							]}
							placeholder="Select driver type"
							error={backendErrors.driver_type}
						/>
						<p className="mt-1 text-xs md:text-sm text-gray-500">
							Nefa Driver: Driver employed by Nefa | Registered Driver: Independent driver
						</p>
					</ThemeUI.FormField>

					{/* Document Verification Status */}
					<ThemeUI.FormField
						label="Verification Status"
						name="verification_status"
						error={backendErrors.verification_status}
						required
					>
						<ThemeUI.Select
							id="verification_status"
							name="verification_status"
							value={formData.verification_status}
							onChange={(selected) =>
								handleInputChange({
									target: { name: "verification_status", value: selected.value },
								})
							}
							options={[
								{ value: "pending", label: "⏳ Pending Review" },
								{ value: "approved", label: "✅ Approved" },
								{ value: "rejected", label: "❌ Rejected" },
								{ value: "suspended", label: "⚠️ Suspended" },
							]}
							placeholder="Select verification status"
							error={backendErrors.verification_status}
						/>
						<p className="mt-1 text-xs md:text-sm text-gray-500">
							Document verification status
						</p>
					</ThemeUI.FormField>

					{/* User Account Status (Active/Inactive) */}
					<ThemeUI.FormField
						label="Account Status"
						name="user_status"
						error={backendErrors.status}
						required
					>
						<ThemeUI.Select
							id="user_status"
							name="user_status"
							value={formData.user_status}
							onChange={(selected) =>
								handleInputChange({
									target: { name: "user_status", value: selected.value },
								})
							}
							options={[
								{ value: 1, label: "✅ Active" },
								{ value: 0, label: "❌ Inactive" },
							]}
							placeholder="Select account status"
							error={backendErrors.status}
							isSearchable={false}
						/>
						<p className="mt-1 text-xs md:text-sm text-gray-500">
							User account active/inactive status
						</p>
					</ThemeUI.FormField>

					{/* Reason Field - Shows only for rejected/suspended */}
					{["rejected", "suspended"].includes(formData.verification_status) && (
						<div className="md:col-span-3">
							<ThemeUI.FormField
								label={`${
									formData.verification_status === "rejected" ? "Rejection" : "Suspension"
								} Reason`}
								name="reason"
								error={backendErrors.reason}
								required
							>
								<ThemeUI.Textarea
									id="reason"
									name="reason"
									rows="4"
									value={formData.reason}
									onChange={handleInputChange}
									placeholder={`Please provide a detailed reason for ${
										formData.verification_status === "rejected"
											? "rejecting"
											: "suspending"
									} this driver...`}
									error={backendErrors.reason}
									className="resize-none"
								/>
								<p className="mt-1 text-xs md:text-sm text-gray-500">
									This reason will be communicated to the driver. Please be
									clear and professional.
								</p>
							</ThemeUI.FormField>
						</div>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 md:pt-6 mt-4 md:mt-6 border-t border-gray-200">
					<ThemeUI.Button
						type="button"
						onClick={handleSaveStatus}
						disabled={isSaving || !formData.user_status || !formData.driver_type}
						gradientColors={{
							start: theme.primaryGradientStart,
							end: theme.primaryGradientEnd,
						}}
						direction={theme.gradientDirection}
						className="w-full sm:w-auto px-4 md:px-6 py-2"
					>
						{isSaving ? (
							<div className="flex items-center justify-center space-x-2">
								<Loader className="animate-spin h-4 w-4 text-white" />
								<span className="text-sm md:text-base">
									Updating Details...
								</span>
							</div>
						) : (
							<div className="flex items-center justify-center space-x-2">
								<svg
									className="h-4 w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span className="text-sm md:text-base">Update Details</span>
							</div>
						)}
					</ThemeUI.Button>
				</div>
			</div>
		</div>
		)
	}, [
		editingDriver,
		formData,
		backendErrors,
		handleImageClick,
		handleInputChange,
		handleSaveStatus,
		isSaving,
		theme,
	])

	const renderDocumentDetails = useCallback(() => {
		if (!editingDriver?.driver_details) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-gray-500">
			<svg
				className="w-12 h-12 mb-4 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<p className="text-lg font-medium">Document details not available</p>
			</div>
		)
		}
		const { driver_details } = editingDriver
		// Helper function to create image URL
		const createImageUrl = (path, filename) => {
		if (!filename) return null
		return `${import.meta.env.VITE_API_URL}${path}${filename}`
		}
		// Parse vehicle images safely
		let vehicleImages = []
		try {
		if (driver_details.vehicle_images) {
			const parsed = JSON.parse(driver_details.vehicle_images)
			vehicleImages = Array.isArray(parsed) ? parsed : []
		}
		} catch (error) {
		console.warn("Error parsing vehicle images:", error)
		vehicleImages = []
		}
		// Prepare all document images for lightbox with null checks
		const documentImages = [
		{
			src: createImageUrl(
			"/uploads/drivers/aadhar/",
			driver_details.aadhar_front_image
			),
			alt: "Aadhar Card - Front Side",
		},
		{
			src: createImageUrl(
			"/uploads/drivers/aadhar/",
			driver_details.aadhar_back_image
			),
			alt: "Aadhar Card - Back Side",
		},
		{
			src: createImageUrl(
			"/uploads/drivers/license/",
			driver_details.license_front_image
			),
			alt: "Driving License - Front Side",
		},
		{
			src: createImageUrl(
			"/uploads/drivers/license/",
			driver_details.license_back_image
			),
			alt: "Driving License - Back Side",
		},
		{
			src: createImageUrl(
			"/uploads/drivers/vehicle-rc/",
			driver_details.vehicle_rc_front_image
			),
			alt: "Vehicle RC - Front Side",
		},
		{
			src: createImageUrl(
			"/uploads/drivers/vehicle-rc/",
			driver_details.vehicle_rc_back_image
			),
			alt: "Vehicle RC - Back Side",
		},
		...vehicleImages.map((image, index) => ({
			src: createImageUrl("/uploads/drivers/vehicles/", image),
			alt: `Vehicle Image ${index + 1}`,
		})),
		].filter((img) => img.src !== null) // Filter out null images
		return (
		<div className="space-y-8">
			{/* Document Images */}
			<div className="grid lg:grid-cols-3 gap-8">
			{/* Aadhar Card */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
				<div className="flex items-center mb-6">
				<div className="w-2 h-6 bg-blue-500 rounded-full mr-3"></div>
				<h3 className="text-lg font-semibold text-gray-900">
					Aadhar Card
				</h3>
				</div>
				<div className="grid grid-cols-2 gap-4">
				<div>
					<p className="text-sm text-gray-600 mb-3 font-medium">
					Front Side
					</p>
					<DocumentImage
					src={documentImages[0]?.src}
					alt={documentImages[0]?.alt || "Aadhar Front"}
					onClick={handleImageClick}
					index={0}
					documentImages={documentImages}
					/>
				</div>
				<div>
					<p className="text-sm text-gray-600 mb-3 font-medium">
					Back Side
					</p>
					<DocumentImage
					src={documentImages[1]?.src}
					alt={documentImages[1]?.alt || "Aadhar Back"}
					onClick={handleImageClick}
					index={1}
					documentImages={documentImages}
					/>
				</div>
				</div>
			</div>
			{/* Driving License */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
				<div className="flex items-center mb-6">
				<div className="w-2 h-6 bg-orange-500 rounded-full mr-3"></div>
				<h3 className="text-lg font-semibold text-gray-900">
					Driving License
				</h3>
				</div>
				<div className="grid grid-cols-2 gap-4">
				<div>
					<p className="text-sm text-gray-600 mb-3 font-medium">
					Front Side
					</p>
					<DocumentImage
					src={documentImages[2]?.src}
					alt={documentImages[2]?.alt || "License Front"}
					onClick={handleImageClick}
					index={2}
					documentImages={documentImages}
					/>
				</div>
				<div>
					<p className="text-sm text-gray-600 mb-3 font-medium">
					Back Side
					</p>
					<DocumentImage
					src={documentImages[3]?.src}
					alt={documentImages[3]?.alt || "License Back"}
					onClick={handleImageClick}
					index={3}
					documentImages={documentImages}
					/>
				</div>
				</div>
			</div>
			{/* Vehicle RC */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
				<div className="flex items-center mb-6">
				<div className="w-2 h-6 bg-green-500 rounded-full mr-3"></div>
				<h3 className="text-lg font-semibold text-gray-900">
					Vehicle RC
				</h3>
				</div>
				<div className="grid grid-cols-2 gap-4">
				<div>
					<p className="text-sm text-gray-600 mb-3 font-medium">
					Front Side
					</p>
					<DocumentImage
					src={documentImages[4]?.src}
					alt={documentImages[4]?.alt || "RC Front"}
					onClick={handleImageClick}
					index={4}
					documentImages={documentImages}
					/>
				</div>
				<div>
					<p className="text-sm text-gray-600 mb-3 font-medium">
					Back Side
					</p>
					<DocumentImage
					src={documentImages[5]?.src}
					alt={documentImages[5]?.alt || "RC Back"}
					onClick={handleImageClick}
					index={5}
					documentImages={documentImages}
					/>
				</div>
				</div>
			</div>
			</div>
			{/* Vehicle Images */}
			{vehicleImages.length > 0 && (
			<div className="bg-gradient-to-br from-gray-50 to-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
				<div className="flex items-center mb-6">
				<div className="w-2 h-6 bg-gray-500 rounded-full mr-3"></div>
				<h3 className="text-lg font-semibold text-gray-900">
					Vehicle Photos
				</h3>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{vehicleImages.map((image, index) => {
					const vehicleImageSrc = createImageUrl(
					"/uploads/drivers/vehicles/",
					image
					)
					// Calculate the correct index in the documentImages array
					const lightboxIndex = 6 + index // 6 document images + vehicle image index
					return (
					<div key={index}>
						<p className="text-sm text-gray-600 mb-3 font-medium">
						Image {index + 1}
						</p>
						<DocumentImage
						src={vehicleImageSrc}
						alt={`Vehicle ${index + 1}`}
						onClick={handleImageClick}
						index={lightboxIndex}
						documentImages={documentImages}
						/>
					</div>
					)
				})}
				</div>
			</div>
			)}
		</div>
		)
	}, [editingDriver, handleImageClick])

	const renderTabContent = useCallback(() => {
		switch (activeTab) {
		case "personal":
			return renderPersonalDetails()
		case "documents":
			return renderDocumentDetails()
		default:
			return renderPersonalDetails()
		}
	}, [activeTab, renderPersonalDetails, renderDocumentDetails])

	// Dynamic custom styles based on screen size
	const customStyles = useMemo(
		() => ({
		headRow: {
			style: {
			background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
			minHeight: isMobile ? "50px" : "56px",
			},
		},
		headCells: {
			style: {
			color: "#ffffff",
			fontWeight: "600",
			fontSize: isMobile ? "13px" : "14px",
			padding: isMobile ? "8px 12px" : "12px",
			},
		},
		cells: {
			style: {
			padding: isMobile ? "8px 12px" : "12px",
			fontSize: isMobile ? "13px" : "14px",
			},
		},
		rows: {
			style: {
			"&:hover": { backgroundColor: "#f8fafc" },
			minHeight: isMobile ? "80px" : "60px",
			borderBottom: "1px solid #e5e7eb",
			},
		},
		pagination: {
			style: {
			fontSize: isMobile ? "13px" : "14px",
			padding: isMobile ? "8px" : "12px",
			},
		},
		}),
		[theme, isMobile]
	)

	// Dynamic pagination options based on screen size
	const paginationComponentOptions = useMemo(
		() => ({
		rowsPerPageText: isMobile ? "Rows:" : "Rows per page:",
		rangeSeparatorText: "of",
		noRowsPerPage: false,
		selectAllRowsItem: false,
		selectAllRowsItemText: "All",
		}),
		[isMobile]
	)

	// Dynamic rows per page options
	const rowsPerPageOptions = useMemo(() => {
		return isMobile ? [5, 10, 25] : [10, 25, 50, 100]
	}, [isMobile])

	return (
		<Layout>
		{/* header & breadcrumb */}
		<div className="flex flex-row justify-between items-center">
			<h1 className="text-2xl font-bold max-sm:text-xl">Drivers</h1>
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
				Drivers
				</li>
			</ol>
			</nav>
		</div>
		{/* Verification Status Tabs */}
		<div className="flex justify-center mb-4">
			<div className="inline-flex rounded-md shadow-sm" role="group">
				{[
					{ value: "all", label: "All", isFirst: true },
					{ value: "pending", label: "Pending" },
					{ value: "approved", label: "Approved" },
					{ value: "rejected", label: "Rejected" },
					{ value: "suspended", label: "Suspended", isLast: true },
				].map(({ value, label, isFirst, isLast }) => (
					<button
						key={value}
						type="button"
						className={`px-4 py-2 text-sm font-medium flex items-center transition-all duration-200 ${
							isFirst ? "rounded-l-md" : isLast ? "rounded-r-md" : "border-r"
						} ${
							statusFilter === value
								? "text-white border-transparent"
								: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
						}`}
						style={
							statusFilter === value
								? {
										background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
								}
								: {}
						}
						onClick={() => handleStatusFilterChange({ value })}
					>
						{label}
					</button>
				))}
			</div>
		</div>
		{/* search & filter */}
		<div className="mb-4 rounded-lg w-full">
			<div className="flex justify-between items-center gap-2">
			<div className="w-full max-sm:flex-1 sm:w-1/3">
				<ThemeUI.Input
				id="search"
				name="search"
				value={searchQuery}
				onChange={handleSearchChange}
				className="bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
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
				>
				<Filter size={16} className="sm:mr-2" />{" "}
				<p className="max-sm:hidden">Filters</p>
				</ThemeUI.Button>
			</div>
			</div>
		</div>
		{/*Ag-Grid Datatable */}
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
			rowData={drivers}
			rowHeight={55}
			columnDefs={columnDefs}
			pagination
			paginationPageSize={10}
			paginationPageSizeSelector={[10, 20, 50, 100]}
			paginationNumberFormatter={(params) => `${params.value}`}
			suppressCellFocus
			suppressPaginationPanel={false}
			noRowsOverlayComponent={NoRowsOverlay}
			noRowsOverlayComponentParams={{ text: "No Drivers Found" }}
			onPaginationChanged={(params) => {
				if (params.api) {
				const newPage = params.api.paginationGetCurrentPage() + 1
				handlePageChange(newPage)
				}
			}}
			/>
		</div>
		{/* Modal */}
		<Modal
			isOpen={isModalOpen}
			onClose={handleCancelEdit}
			title={`Edit Driver: ${editingDriver?.name || ""}`}
			size="full"
		>
			<div className="bg-gray-50 border-t border-gray-200 shadow-sm">
			<nav className="flex space-x-0" aria-label="Tabs">
				<button
				className={`relative px-6 py-4 text-sm font-medium transition-all duration-200 border-r border-gray-200 ${
					activeTab === "personal"
					? "text-white shadow-md"
					: "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
				}`}
				style={
					activeTab === "personal"
					? {
						background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
						boxShadow:
							"0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
						}
					: {}
				}
				onClick={() => setActiveTab("personal")}
				>
				<span className="flex items-center">
					<svg
					className="w-4 h-4 mr-2"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
					/>
					</svg>
					Personal Details
				</span>
				{/* Active tab indicator */}
				{activeTab === "personal" && (
					<div
					className="absolute bottom-0 left-0 right-0 h-0.5"
					style={{
						background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
					}}
					/>
				)}
				</button>
				<button
				className={`relative px-6 py-4 text-sm font-medium transition-all duration-200 ${
					activeTab === "documents"
					? "text-white shadow-md"
					: "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
				}`}
				style={
					activeTab === "documents"
					? {
						background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
						boxShadow:
							"0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
						}
					: {}
				}
				onClick={() => setActiveTab("documents")}
				>
				<span className="flex items-center">
					<svg
					className="w-4 h-4 mr-2"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
					</svg>
					Documents
				</span>
				{/* Active tab indicator */}
				{activeTab === "documents" && (
					<div
					className="absolute bottom-0 left-0 right-0 h-0.5"
					style={{
						background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
					}}
					/>
				)}
				</button>
			</nav>
			</div>
			<div className="bg-gray-50 border border-gray-200 shadow-sm min-h-[500px]">
			{isLoading ? (
				<div className="flex justify-center items-center py-12">
				<Loader
					className="animate-spin"
					size={32}
					style={{ color: theme.primaryGradientStart }}
				/>
				</div>
			) : (
				<div className="p-6">{renderTabContent()}</div>
			)}
			</div>
		</Modal>
		{/* Lightbox */}
		<Lightbox
			open={isLightboxOpen}
			close={() => setIsLightboxOpen(false)}
			slides={lightboxImages}
			index={lightboxIndex}
		/>
		{/* Offcanvas */}
		<Offcanvas
			isOpen={isFilterOffcanvasOpen}
			onClose={() => setIsFilterOffcanvasOpen(false)}
			title="Filter Options"
			position="right"
			size="sm"
		>
			<div className="space-y-4">
				<ThemeUI.FormField label="Verification Status" name="status">
					<ThemeUI.Select
						id="status"
						name="status"
						value={statusFilter}
						onChange={handleStatusFilterChange}
						options={[
							{ value: "all", label: "All" },
							{ value: "pending", label: "Pending" },
							{ value: "approved", label: "Approved" },
							{ value: "rejected", label: "Rejected" },
							{ value: "suspended", label: "Suspended" },
						]}
						placeholder="Filter by verification status"
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Deposit Status" name="deposit_status">
					<ThemeUI.Select
						id="deposit_status"
						name="deposit_status"
						value={depositStatusFilter}
						onChange={handleDepositStatusFilterChange}
						options={[
							{ value: "all", label: "All" },
							{ value: "paid", label: "Paid" },
							{ value: "pending", label: "Pending" },
							{ value: "failed", label: "Failed" },
						]}
						placeholder="Filter by deposit status"
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Account Status" name="account_status">
					<ThemeUI.Select
						id="account_status"
						name="account_status"
						value={accountStatusFilter}
						onChange={handleAccountStatusFilterChange}
						options={[
							{ value: "all", label: "All" },
							{ value: "1", label: "Active" },
							{ value: "0", label: "Inactive" },
						]}
						placeholder="Filter by account status"
					/>
				</ThemeUI.FormField>
			</div>
		</Offcanvas>
		</Layout>
	)
}
export default Drivers
